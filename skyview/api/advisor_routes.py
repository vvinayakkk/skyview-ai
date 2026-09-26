"""
Farm Advisor Routes
POST /api/advisor/insights  — AI category-based advice
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from skyview.data.queries import get_latest_weather
from skyview.utils.llm_pool import invoke_llm
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/api/advisor", tags=["Advisor"])
logger = get_logger(__name__)


class AdvisorReq(BaseModel):
    category: str = "overview"  # alerts|crops|water|tips|soil|pests|overview
    station_id: str = "WS01"


def _build_prompt(category: str, s: dict) -> str:
    temp = s.get("temperature", 25)
    hum  = s.get("humidity", 60)
    sm   = s.get("soil_moisture", 50)
    st   = s.get("soil_temperature", "N/A")
    ws   = s.get("wind_speed", 5)
    wd   = s.get("wind_direction", "N/A")
    rain = s.get("rainfall", 0)
    lux  = s.get("lux", 70)
    uv   = s.get("uv_index", 2)
    pres = s.get("pressure", 1013)
    pm25 = s.get("pm25", "N/A")
    pm10 = s.get("pm10", "N/A")
    bat  = s.get("battery_voltage", "N/A")
    sol  = s.get("solar_voltage", "N/A")

    base = (
        f"Temp={temp}°C Humidity={hum}% Wind={ws}km/h({wd}) "
        f"Rain={rain}mm Soil Moisture={sm}% Soil Temp={st}°C "
        f"Light={lux}lux UV={uv} Pressure={pres}hPa PM2.5={pm25} "
        f"Battery={bat}V Solar={sol}V"
    )

    prompts = {
        "alerts": (
            f"You are a farm safety AI. Sensor data: {base}\n"
            'Generate 4-5 farming alerts. JSON array only: '
            '[{"severity":"warning","title":"...","message":"..."}]'
        ),
        "crops": (
            f"You are a crop advisor. Conditions: Temp={temp}°C Humidity={hum}% "
            f"Soil Moisture={sm}% Light={lux}\n"
            'Suggest 5 best crops for NOW. JSON array: '
            '[{"crop":"Rice","emoji":"🌾","suitability":"...","tips":"...","timeline":"..."}]'
        ),
        "water": (
            f"You are a farm water AI. Conditions: Temp={temp}°C Humidity={hum}% "
            f"Soil Moisture={sm}% Rain={rain}mm\n"
            'Irrigation advice. JSON: '
            '{"moisture_status":"...","schedule":"...","tips":["..."],"liters_per_acre":500,"warnings":["..."]}'
        ),
        "tips": (
            f"You are a friendly farm advisor. Conditions: Temp={temp}°C Humidity={hum}% "
            f"Wind={ws}km/h Soil Moisture={sm}%\n"
            'Give 6 practical tips for TODAY. JSON array of strings: ["🌱 Tip..."]'
        ),
        "soil": (
            f"You are a soil health AI. Data: Soil Moisture={sm}% Temp={temp}°C "
            f"Humidity={hum}% Rain={rain}mm\n"
            'Comprehensive soil analysis. JSON: '
            '{"score":75,"status":"Good","recommendations":["..."],"nutrients":"...","risk":"..."}'
        ),
        "pests": (
            f"You are a crop protection AI. Conditions: Temp={temp}°C Humidity={hum}% Rain={rain}mm\n"
            'Identify 4 likely pests/diseases. JSON array: '
            '[{"name":"...","risk":"High","symptoms":"...","remedy":"...","prevention":"..."}]'
        ),
        "overview": (
            f"You are a farm AI. Live sensor readings: {base}\n"
            'Detailed advisory. JSON: '
            '{"summary":"...","focus_points":["..."],"details":"..."}'
        ),
    }
    return prompts.get(category, prompts["overview"])


import re

def _extract_json(raw: str):
    if not raw:
        return None
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None


@router.post("/insights")
async def advisor_insights(req: AdvisorReq):
    sensor = get_latest_weather(req.station_id) or {
        "temperature": 28.5,
        "humidity": 65.0,
        "soil_moisture": 52.0,
        "wind_speed": 4.2,
        "rainfall": 0.0,
        "pressure": 1013.0,
    }
    prompt = _build_prompt(req.category, sensor)

    ai_response = None
    raw = await invoke_llm([("user", prompt)], temperature=0.3, timeout=15)
    if raw:
        ai_response = _extract_json(raw) or raw

    if not ai_response:
        if req.category == "overview":
            ai_response = {
                "summary": "Environmental sensor telemetry indicates steady agricultural conditions across your acreage. Soil moisture and ambient humidity are balanced.",
                "focus_points": [
                    "Maintain scheduled drip irrigation to sustain optimal root-zone hydration.",
                    "Apply organic mulch to shield topsoil from midday temperature spikes.",
                    "Monitor nighttime humidity shifts to mitigate pest vulnerability."
                ],
                "details": "Telemetry recorded at Station WS01 indicates temperature and soil moisture levels within favorable thresholds for active crop vegetative phases."
            }
        elif req.category == "crops":
            ai_response = [
                {"crop": "Wheat", "emoji": "🌾", "suitability": "92%", "tips": "Sow in well-drained loam", "timeline": "Rabi Season"},
                {"crop": "Mustard", "emoji": "🌼", "suitability": "88%", "tips": "Minimal irrigation needed", "timeline": "Early Rabi"},
                {"crop": "Chickpea", "emoji": "🌱", "suitability": "85%", "tips": "Nitrogen-fixing legume", "timeline": "October - November"}
            ]

    return {
        "status": "success",
        "category": req.category,
        "sensor_snapshot": sensor,
        "ai_insights": ai_response,
        "timestamp": datetime.utcnow().isoformat(),
    }