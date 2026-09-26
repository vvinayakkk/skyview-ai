"""
test_ingestion.py — Tests for sensor data ingestion pipeline.
Run: pytest tests/test_ingestion.py -v
"""

import pytest


NESTED_PAYLOAD = {
    "id": "WS01",
    "ts": 1700000000,
    "env": {"t": 28.5, "h": 65.0, "p": 1012.0},
    "wind": {"s": 3.2, "d": "NE"},
    "rain": 0.5,
    "soil": {"t": 27.0, "m": 52.0},
    "air": {"pm25": 55.0, "pm10": 110.0},
    "rad": {"uv": 4.0, "lux": 35000.0},
    "pwr": {"bat": 3.8, "sol": 5.1},
}

FLAT_PAYLOAD = {
    "station_id": "WS02",
    "temperature": 30.0,
    "humidity": 70.0,
    "pressure": 1010.0,
    "wind_speed": 5.0,
    "wind_direction": "SW",
    "rainfall": 1.2,
    "soil_temperature": 28.0,
    "soil_moisture": 60.0,
    "pm25": 40.0,
    "pm10": 80.0,
    "uv_index": 6.0,
    "lux": 45000.0,
    "battery_voltage": 4.0,
    "solar_voltage": 5.5,
}


class TestIngestion:
    def test_nested_format_ingest(self, client):
        """Hardware nested JSON format (ESP32 → LoRa → RPi)."""
        r = client.post("/api/sensors/data", json=NESTED_PAYLOAD)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("success", "db_error")
        assert data["station_id"] == "WS01"

    def test_flat_format_ingest(self, client):
        """Flat JSON format (direct HTTP from test scripts)."""
        r = client.post("/api/sensors/data", json=FLAT_PAYLOAD)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("success", "db_error")
        assert data["station_id"] == "WS02"

    def test_missing_fields_returns_error(self, client):
        """Partial nested payload should return error, not 500."""
        r = client.post("/api/sensors/data", json={"id": "WS01"})
        assert r.status_code == 200   # FastAPI returns 200 with error body
        assert r.json()["status"] == "error"

    def test_invalid_json_returns_error(self, client):
        """Non-JSON body should return graceful error."""
        r = client.post(
            "/api/sensors/data",
            content=b"not-json",
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code in (200, 422)

    def test_history_returns_data_key(self, client):
        """Frontend expects `data` key in history response."""
        r = client.get("/api/sensors/history/WS01")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body, "Frontend needs `data` key in history response"
        assert isinstance(body["data"], list)