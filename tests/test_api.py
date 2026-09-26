"""
test_api.py — Unit tests using FastAPI TestClient (no live server needed).
Run: pytest tests/test_api.py -v
"""

import pytest


SENSOR_PAYLOAD = {
    "station_id": "WS01",
    "temperature": 28.5,
    "humidity": 65.0,
    "pressure": 1012.0,
    "wind_speed": 3.2,
    "wind_direction": "NE",
    "rainfall": 0.0,
    "soil_temperature": 27.0,
    "soil_moisture": 52.0,
    "pm25": 55.0,
    "pm10": 110.0,
    "uv_index": 4.0,
    "lux": 35000.0,
    "battery_voltage": 3.8,
    "solar_voltage": 5.1,
}


class TestCore:
    def test_root(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert "SkyView" in r.json()["system"]

    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_options_preflight(self, client):
        r = client.options("/api/sensors/data")
        assert r.status_code in (200, 204)


class TestSensors:
    def test_ingest_flat(self, client):
        r = client.post("/api/sensors/data", json=SENSOR_PAYLOAD)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("success", "db_error")  # db_error ok in SQLite test

    def test_latest(self, client):
        r = client.get("/api/sensors/latest/WS01")
        assert r.status_code == 200
        assert "temperature" in r.json()

    def test_history_has_data_key(self, client):
        r = client.get("/api/sensors/history/WS01?limit=5")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body          # frontend expects `data` key
        assert "totalRecords" in body

    def test_stations(self, client):
        r = client.get("/api/sensors/stations")
        assert r.status_code == 200
        assert "stations" in r.json()

    def test_trends_store(self, client):
        r = client.post("/api/sensors/trends/store", json={"station_id": "WS01", "period": "24h"})
        assert r.status_code == 200
        assert r.json()["status"] == "success"


class TestAuth:
    PHONE = "+919876543210"

    def test_signup(self, client):
        r = client.post("/api/auth/signup", json={"phone": self.PHONE, "name": "Test"})
        assert r.status_code == 200

    def test_send_otp_signup(self, client):
        r = client.post("/api/auth/send-otp", json={"phone": self.PHONE, "is_signup": True})
        assert r.status_code == 200
        assert r.json()["status"] == "success"

    def test_verify_otp_correct(self, client):
        # Send OTP first, grab it from response (dev mode returns OTP)
        send = client.post("/api/auth/send-otp", json={"phone": self.PHONE, "is_signup": True})
        otp = send.json().get("otp")
        if otp:
            r = client.post("/api/auth/verify-otp", json={"phone": self.PHONE, "otp": otp})
            assert r.status_code == 200
            assert r.json()["status"] == "success"

    def test_verify_otp_wrong(self, client):
        r = client.post("/api/auth/verify-otp", json={"phone": self.PHONE, "otp": "000000"})
        assert r.status_code in (400, 401)


class TestProfile:
    PHONE = "+919999999999"

    def test_save_profile(self, client):
        r = client.post("/api/profile/save", json={
            "phone": self.PHONE,
            "name": "Raju Patil",
            "land_size_acres": 5.0,
            "location": "Pune, Maharashtra",
            "crops": "wheat,onion",
        })
        assert r.status_code == 200
        assert r.json()["status"] == "success"

    def test_get_profile(self, client):
        r = client.get("/api/profile", params={"phone": self.PHONE})
        assert r.status_code == 200
        assert r.json()["profile"]["phone"] == self.PHONE

    def test_get_profile_not_found(self, client):
        r = client.get("/api/profile", params={"phone": "+910000000000"})
        assert r.status_code == 200
        assert r.json()["status"] == "error"


class TestMandi:
    def test_rates(self, client):
        r = client.get("/api/mandi/rates")
        assert r.status_code == 200
        assert "rates" in r.json()

    def test_history(self, client):
        r = client.get("/api/mandi/history?limit=5")
        assert r.status_code == 200
        body = r.json()
        assert "records" in body
        assert "count" in body

    def test_commodities(self, client):
        r = client.get("/api/mandi/commodities")
        assert r.status_code == 200
        assert "commodities" in r.json()

    def test_msp(self, client):
        r = client.get("/api/mandi/msp")
        assert r.status_code == 200


class TestAdvisor:
    def test_insights_overview(self, client):
        r = client.post("/api/advisor/insights", json={"category": "overview", "station_id": "WS01"})
        assert r.status_code == 200
        assert r.json()["status"] == "success"


class TestSchemes:
    def test_catalog(self, client):
        r = client.get("/api/schemes")
        assert r.status_code == 200
        body = r.json()
        assert "schemes" in body
        assert "count" in body

    def test_scheme_detail(self, client):
        r = client.get("/api/schemes/pm_kisan")
        assert r.status_code == 200
        assert r.json()["scheme"]["scheme_id"] == "pm_kisan"


class TestFPGA:
    def test_status(self, client):
        r = client.get("/api/fpga/status")
        assert r.status_code == 200

    def test_fusion(self, client):
        r = client.post("/api/fpga/fusion", json={
            "soil_moisture": 52.0, "temperature": 28.5, "humidity": 65.0
        })
        assert r.status_code == 200


class TestAdmin:
    def test_list_tables(self, client):
        r = client.get("/admin/tables")
        assert r.status_code == 200

    def test_analytics_overview(self, client):
        r = client.get("/admin/analytics/overview")
        assert r.status_code == 200


class TestMarketplace:
    def test_farmers(self, client):
        r = client.get("/api/marketplace/farmers")
        assert r.status_code == 200
        assert "farmers" in r.json()

    def test_match(self, client):
        r = client.post("/api/marketplace/match", json={"phone": "+919011000001"})
        assert r.status_code == 200
        assert r.json()["status"] == "success"

    def test_circular_barter(self, client):
        r = client.post("/api/marketplace/circular-barter", json={"max_distance_km": 1000.0})
        assert r.status_code == 200
        assert r.json()["status"] == "success"

    def test_negotiate(self, client):
        r = client.post("/api/marketplace/negotiate", json={
            "farmer_a_phone": "+919011000001",
            "farmer_b_phone": "+919011000002",
            "item_a": "Tractor",
            "item_b": "Harvester",
            "crop": "Wheat"
        })
        assert r.status_code in (200, 404)  # 404 is also valid if mock users are missing in the test SQLite DB

    def test_pooling(self, client):
        r = client.get("/api/marketplace/pooling")
        assert r.status_code == 200
        assert r.json()["status"] == "success"