"""
Sensor Data Routes
POST /api/sensors/data            — hardware ingestion (LoRa/ESP32 nested JSON)
POST /api/sensors/ingest          — flat JSON ingestion (test_all_routes compatible)
GET  /api/sensors/latest/{station_id}
GET  /api/sensors/history/{station_id}
GET  /api/sensors/stations
POST /api/sensors/trends/store    — store a trends snapshot from the frontend
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

from skyview.data.db import execute_update, get_session
from skyview.data.queries import (
    get_active_installations,
    get_latest_weather,
    get_weather_history,
)
from skyview.utils.logger import get_logger

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])
logger = get_logger(__name__)

_MOCK_READING = {
    "station_id": "WS01", "temperature": 25.0, "humidity": 60.0,
    "pressure": 1013.0, "wind_speed": 5.0, "wind_direction": "N",
    "rainfall": 0.0, "soil_temperature": 26.0, "soil_moisture": 50.0,
    "pm25": 60.0, "pm10": 120.0, "uv_index": 2.0,
    "lux": 70.0, "battery_voltage": 12.5, "solar_voltage": 13.2,
}


# ── Models ────────────────────────────────────────────────────────────────────

class FlatSensorPayload(BaseModel):
    """Flat sensor payload used by test_all_routes and direct HTTP callers."""
    station_id: str = "WS01"
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    pressure: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[str] = None
    rainfall: Optional[float] = None
    soil_temperature: Optional[float] = None
    soil_moisture: Optional[float] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    uv_index: Optional[float] = None
    lux: Optional[float] = None
    battery_voltage: Optional[float] = None
    solar_voltage: Optional[float] = None


class TrendsStoreReq(BaseModel):
    station_id: str = "WS01"
    period: str = "24h"
    data: Optional[list] = None  # raw chart data to persist if needed


# ── Helpers ───────────────────────────────────────────────────────────────────

def _insert_weather(params: dict) -> bool:
    from sqlalchemy import text
    return execute_update(
        text("""
            INSERT INTO weather_data (
                station_id, timestamp,
                temperature, humidity, pressure,
                wind_speed, wind_direction, rainfall,
                soil_temperature, soil_moisture,
                pm25, pm10, uv_index, lux,
                battery_voltage, solar_voltage
            ) VALUES (
                :sid, :ts, :temp, :hum, :pres,
                :ws, :wd, :rain,
                :st, :sm, :pm25, :pm10, :uv, :lux, :bat, :sol
            )
        """),
        params,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stations")
def list_stations():
    return {"stations": get_active_installations()}


@router.get("/latest/{station_id}")
def latest_reading(station_id: str = "WS01"):
    data = get_latest_weather(station_id)
    if not data:
        return {
            **_MOCK_READING,
            "station_id": station_id,
            "timestamp": datetime.utcnow().isoformat(),
            "_source": "mock",
        }
    return data


@router.get("/history/{station_id}")
def history(station_id: str = "WS01", hours: int = 24, limit: int = 200):
    """
    Returns historical readings.
    Response shape: { station_id, data: [...], totalRecords, returnedRecords }
    The `data` key is what the frontend (weatherData.ts) expects.
    """
    rows = get_weather_history(station_id, hours, limit)
    return {
        "station_id": station_id,
        "data": rows,
        "totalRecords": len(rows),
        "returnedRecords": len(rows),
    }


@router.post("/data")
async def ingest_sensor_data_nested(request: Request):
    """
    Hardware ingestion endpoint for ESP32/LoRa nested JSON format:
    { id, ts, env:{t,h,p}, wind:{s,d}, rain, soil:{t,m}, air:{pm25,pm10},
      rad:{uv,lux}, pwr:{bat,sol} }
    Also accepts the flat format for backwards compatibility.
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON body"}

    # ── Flat format (station_id + flat fields) ────────────────
    if "station_id" in data and "temperature" in data:
        ts = datetime.utcnow()
        success = _insert_weather({
            "sid": data.get("station_id", "UNKNOWN"), "ts": ts,
            "temp": data.get("temperature"), "hum": data.get("humidity"),
            "pres": data.get("pressure"), "ws": data.get("wind_speed"),
            "wd": data.get("wind_direction"), "rain": data.get("rainfall", 0.0),
            "st": data.get("soil_temperature"), "sm": data.get("soil_moisture"),
            "pm25": data.get("pm25"), "pm10": data.get("pm10"),
            "uv": data.get("uv_index"), "lux": data.get("lux"),
            "bat": data.get("battery_voltage"), "sol": data.get("solar_voltage"),
        })
        return {"status": "success" if success else "db_error",
                "station_id": data.get("station_id"), "timestamp": ts.isoformat()}

    # ── Nested hardware format ────────────────────────────────
    required = ["id", "ts", "env", "wind", "soil", "air", "rad", "pwr"]
    missing = [f for f in required if f not in data]
    if missing:
        return {"status": "error", "message": f"Missing fields: {missing}"}

    station_id = data.get("id", "UNKNOWN")
    ts = datetime.fromtimestamp(data.get("ts", 0))
    env  = data.get("env", {})
    wind = data.get("wind", {})
    soil = data.get("soil", {})
    air  = data.get("air", {})
    rad  = data.get("rad", {})
    pwr  = data.get("pwr", {})

    success = _insert_weather({
        "sid": station_id, "ts": ts,
        "temp": env.get("t"), "hum": env.get("h"), "pres": env.get("p"),
        "ws": wind.get("s"), "wd": wind.get("d"),
        "rain": data.get("rain", 0.0),
        "st": soil.get("t"), "sm": soil.get("m"),
        "pm25": air.get("pm25"), "pm10": air.get("pm10"),
        "uv": rad.get("uv"), "lux": rad.get("lux"),
        "bat": pwr.get("bat"), "sol": pwr.get("sol"),
    })

    logger.info("Hardware data received from %s at %s", station_id, ts)
    return {
        "status": "success" if success else "db_error",
        "station_id": station_id,
        "timestamp": ts.isoformat(),
    }


@router.post("/trends/store")
async def store_trends(req: TrendsStoreReq):
    """
    Called by the Trends page to persist a snapshot or simply acknowledge.
    Currently logs and returns OK; extend to write to a trends table if needed.
    """
    logger.info("Trends snapshot received: station=%s period=%s points=%d",
                req.station_id, req.period, len(req.data) if req.data else 0)
    return {
        "status": "success",
        "station_id": req.station_id,
        "period": req.period,
        "message": "Trends snapshot acknowledged",
    }