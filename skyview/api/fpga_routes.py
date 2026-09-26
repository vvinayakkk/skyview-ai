"""
FPGA Accelerator Routes
POST /api/fpga/fusion
POST /api/fpga/rain-predict
POST /api/fpga/combined-analysis
POST /api/fpga/test
GET  /api/fpga/status
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from skyview.agents.fpga_agent import get_fpga_bridge, is_real_hardware
from skyview.utils.llm_pool import invoke_llm
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/api/fpga", tags=["FPGA"])
logger = get_logger(__name__)

_HW_MODE = lambda: "real_hardware"


class FusionInput(BaseModel):
    soil_moisture: float = 50.0
    temperature: float = 25.0
    humidity: float = 60.0
    light_level: float = 70.0
    user_id: Optional[str] = None


class RainInput(BaseModel):
    temperature: float = 25.0
    humidity: float = 60.0
    pressure: float = 1013.0
    wind_speed: float = 5.0
    station_id: str = "WS01"


class CombinedInput(BaseModel):
    soil_moisture: float = 50.0
    temperature: float = 25.0
    humidity: float = 60.0
    light_level: float = 70.0
    station_id: str = "WS01"
    user_id: Optional[str] = None


async def _llm_validate_fusion(raw: dict, inputs: FusionInput) -> dict:
    prompt = (
        f"FPGA Sensor Fusion raw output: {json.dumps(raw)}\n"
        f"Actual readings: Soil={inputs.soil_moisture}%, Temp={inputs.temperature}°C, "
        f"Humidity={inputs.humidity}%, Light={inputs.light_level}%\n"
        "Cross-validate and reply with JSON only: "
        '{"adjusted_fusion_score":<0-100>,"adjusted_stress_index":<0-100>,'
        '"adjusted_alert_level":<0-3>,"alert_name":"<Normal/Moderate/High/Critical>",'
        '"assessment":"<2 sentences>","recommendations":["<tip1>","<tip2>","<tip3>"]}'
    )
    content = await invoke_llm([("user", prompt)], temperature=0.1, timeout=12)
    if not content:
        return {}
    try:
        return json.loads(content.strip().lstrip("```json").rstrip("```"))
    except Exception:
        return {}


async def _llm_validate_rain(raw: dict, inputs: RainInput) -> dict:
    prompt = (
        f"FPGA Rain Prediction raw: {json.dumps(raw)}\n"
        f"Actual: Temp={inputs.temperature}°C, Humidity={inputs.humidity}%, "
        f"Pressure={inputs.pressure} hPa, Wind={inputs.wind_speed} km/h\n"
        "Cross-validate and reply with JSON only: "
        '{"adjusted_rain_probability":<0-100>,"adjusted_stress_level":<0-100>,'
        '"rain_alert":<0or1>,"confidence":"<high/medium/low>",'
        '"recommendation":"<2 sentences>","reasoning":"<1 sentence>"}'
    )
    content = await invoke_llm([("user", prompt)], temperature=0.1, timeout=12)
    if not content:
        return {}
    try:
        return json.loads(content.strip().lstrip("```json").rstrip("```"))
    except Exception:
        return {}


@router.get("/status")
def fpga_status():
    bridge = get_fpga_bridge()
    return {
        "status": "ok",
        "hardware_mode": _HW_MODE(),
        "fpga_status": bridge.get_status(),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/fusion")
async def sensor_fusion(data: FusionInput):
    bridge = get_fpga_bridge()
    raw = bridge.send_fusion(
        int(round(data.soil_moisture)), int(round(data.temperature)),
        int(round(data.humidity)), int(round(data.light_level)),
    )
    adjusted = await _llm_validate_fusion(raw, data)
    final = {
        "fusion_score":  adjusted.get("adjusted_fusion_score",  raw.get("fusion_score")),
        "stress_index":  adjusted.get("adjusted_stress_index",  raw.get("stress_index")),
        "alert_level":   adjusted.get("adjusted_alert_level",   raw.get("alert_level")),
        "alert_name":    adjusted.get("alert_name",             raw.get("alert_name", "Normal")),
        "timestamp":     raw.get("timestamp"),
    }
    return {
        "status": "success", "hardware_mode": _HW_MODE(),
        "fpga_result": final, "fpga_raw": raw,
        "ai_insights": adjusted.get("assessment", ""),
        "ai_recommendations": adjusted.get("recommendations", []),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/rain-predict")
async def rain_predict(data: RainInput):
    bridge = get_fpga_bridge()
    raw = bridge.send_rain_prediction(
        int(round(data.temperature)), int(round(data.humidity)),
        int(round(data.pressure)), int(round(data.wind_speed)),
    )
    adjusted = await _llm_validate_rain(raw, data)
    final = {
        "rain_probability": adjusted.get("adjusted_rain_probability", raw.get("rain_probability")),
        "stress_level":     adjusted.get("adjusted_stress_level",     raw.get("stress_level")),
        "rain_alert":       adjusted.get("rain_alert",                raw.get("rain_alert")),
        "confidence":       adjusted.get("confidence", "medium"),
        "timestamp":        raw.get("timestamp"),
    }
    return {
        "status": "success", "hardware_mode": _HW_MODE(),
        "prediction": final, "fpga_raw": raw,
        "farmer_recommendation": adjusted.get("recommendation", ""),
        "ai_reasoning": adjusted.get("reasoning", ""),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/combined-analysis")
async def combined_analysis(data: CombinedInput):
    fusion_data = FusionInput(
        soil_moisture=data.soil_moisture, temperature=data.temperature,
        humidity=data.humidity, light_level=data.light_level, user_id=data.user_id,
    )
    rain_data = RainInput(
        temperature=data.temperature, humidity=data.humidity,
        pressure=1013.0, wind_speed=5.0, station_id=data.station_id,
    )
    f_resp = await sensor_fusion(fusion_data)
    r_resp = await rain_predict(rain_data)

    fs = f_resp.get("fpga_result", {})
    rp = r_resp.get("prediction", {})

    prompt = (
        f"Farm results: Fusion={fs.get('fusion_score')}/100, "
        f"Stress={fs.get('stress_index')}%, Rain={rp.get('rain_probability')}%. "
        f"Sensor: Temp={data.temperature}°C, Soil={data.soil_moisture}%, "
        f"Humidity={data.humidity}%. "
        'Reply JSON: {"overall_risk":"<low/moderate/high/critical>",'
        '"recommendation":"<2-3 sentences>","actions":["<a1>","<a2>","<a3>"]}'
    )
    rec_raw = await invoke_llm([("user", prompt)], temperature=0.2, timeout=12)
    rec = {}
    if rec_raw:
        try:
            rec = json.loads(rec_raw.strip().lstrip("```json").rstrip("```"))
        except Exception:
            pass

    return {
        "status": "success", "hardware_mode": _HW_MODE(),
        "sensor_fusion": fs, "rain_prediction": rp,
        "combined_analysis": {
            "overall_risk_level": rec.get("overall_risk", "low"),
            "recommendation": rec.get("recommendation", ""),
            "actions": rec.get("actions", []),
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/test")
async def fpga_test():
    bridge = get_fpga_bridge()
    cases = [
        {"name": "Optimal",    "soil": 50, "temp": 25, "humid": 60, "light": 70},
        {"name": "Dry Soil",   "soil": 10, "temp": 30, "humid": 40, "light": 80},
        {"name": "Hot",        "soil": 60, "temp": 40, "humid": 30, "light": 90},
        {"name": "Frost Risk", "soil": 50, "temp":  2, "humid": 80, "light": 30},
    ]
    results = [
        {"test": c["name"], "input": c,
         "output": bridge.send_fusion(c["soil"], c["temp"], c["humid"], c["light"])}
        for c in cases
    ]
    return {"status": "success", "tests": results, "hardware_mode": _HW_MODE()}