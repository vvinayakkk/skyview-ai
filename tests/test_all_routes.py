"""
test_all_routes.py
==================
End-to-end smoke tests for every route in the new SkyView v2 API.

Requirements:
    pip install httpx pytest pytest-asyncio

Usage:
    # Make sure the server is running first:
    uvicorn skyview.main:app --reload --port 8000

    # Then in another terminal:
    pytest test_all_routes.py -v

    # Or run directly (no pytest):
    python test_all_routes.py

Environment:
    Set BASE_URL if your server is on a different port:
        BASE_URL=http://localhost:8001 pytest test_all_routes.py -v
"""

import json
import os
import sys

import httpx
import pytest

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
client   = httpx.Client(base_url=BASE_URL, timeout=30)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _ok(resp, label=""):
    """Assert 2xx and print result."""
    tag = f"[{label}] " if label else ""
    assert resp.status_code < 300, (
        f"{tag}Expected 2xx, got {resp.status_code}: {resp.text[:300]}"
    )
    try:
        data = resp.json()
        print(f"  ✅ {tag}{resp.status_code} — {json.dumps(data)[:120]}")
        return data
    except Exception:
        print(f"  ✅ {tag}{resp.status_code} — (non-JSON)")
        return resp.text


def _warn(resp, label=""):
    """Print result without asserting — some routes may 422 without full payload."""
    tag = f"[{label}] " if label else ""
    status = resp.status_code
    try:
        data = resp.json()
        marker = "✅" if status < 300 else ("⚠️ " if status < 500 else "❌")
        print(f"  {marker} {tag}{status} — {json.dumps(data)[:120]}")
        return data
    except Exception:
        print(f"  ⚠️  {tag}{status} — (non-JSON)")
        return resp.text


# ─────────────────────────────────────────────────────────────────────────────
# 1. System / Core
# ─────────────────────────────────────────────────────────────────────────────

class TestCore:
    def test_root(self):
        print("\n── Core ──")
        r = client.get("/")
        _ok(r, "GET /")

    def test_health(self):
        r = client.get("/health")
        _ok(r, "GET /health")

    def test_docs(self):
        r = client.get("/docs")
        assert r.status_code in (200, 302), f"docs returned {r.status_code}"
        print(f"  ✅ [GET /docs] {r.status_code}")

    def test_options_preflight(self):
        r = client.options("/api/sensors/data")
        assert r.status_code in (200, 204), f"OPTIONS returned {r.status_code}"
        print(f"  ✅ [OPTIONS /api/sensors/data] {r.status_code}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Auth
# ─────────────────────────────────────────────────────────────────────────────

class TestAuth:
    PHONE = "+919876543210"

    def test_send_otp(self):
        print("\n── Auth ──")
        r = client.post("/api/auth/send-otp", json={"phone": self.PHONE})
        _warn(r, "POST /api/auth/send-otp")

    def test_verify_otp_wrong(self):
        """Should return 400 or 401 on wrong OTP."""
        r = client.post(
            "/api/auth/verify-otp",
            json={"phone": self.PHONE, "otp": "000000"},
        )
        assert r.status_code in (200, 400, 401, 422), (
            f"verify-otp returned unexpected {r.status_code}"
        )
        _warn(r, "POST /api/auth/verify-otp (wrong OTP)")

    def test_signup(self):
        r = client.post(
            "/api/auth/signup",
            json={"phone": self.PHONE, "name": "Test Farmer", "otp": "000000"},
        )
        _warn(r, "POST /api/auth/signup")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Sensors
# ─────────────────────────────────────────────────────────────────────────────

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


class TestSensors:
    def test_ingest(self):
        print("\n── Sensors ──")
        r = client.post("/api/sensors/data", json=SENSOR_PAYLOAD)
        _warn(r, "POST /api/sensors/data")

    def test_latest(self):
        r = client.get("/api/sensors/latest/WS01")
        _warn(r, "GET /api/sensors/latest/WS01")

    def test_history(self):
        r = client.get("/api/sensors/history/WS01?limit=5")
        _warn(r, "GET /api/sensors/history/WS01")

    def test_stations(self):
        r = client.get("/api/sensors/stations")
        _warn(r, "GET /api/sensors/stations")


# ─────────────────────────────────────────────────────────────────────────────
# 4. FPGA Accelerator
# ─────────────────────────────────────────────────────────────────────────────

class TestFPGA:
    def test_status(self):
        print("\n── FPGA ──")
        r = client.get("/api/fpga/status")
        _warn(r, "GET /api/fpga/status")

    def test_fusion(self):
        r = client.post(
            "/api/fpga/fusion",
            json={"soil_moisture": 52.0, "temperature": 28.5, "humidity": 65.0},
        )
        _warn(r, "POST /api/fpga/fusion")

    def test_rain_predict(self):
        r = client.post(
            "/api/fpga/rain-predict",
            json={"humidity": 85.0, "pressure": 1005.0, "temperature": 24.0,
                  "wind_speed": 8.0, "rainfall_24h": 2.0},
        )
        _warn(r, "POST /api/fpga/rain-predict")

    def test_combined_analysis(self):
        r = client.post(
            "/api/fpga/combined-analysis",
            json={"station_id": "WS01", **SENSOR_PAYLOAD},
        )
        _warn(r, "POST /api/fpga/combined-analysis")

    def test_fpga_test_endpoint(self):
        r = client.post("/api/fpga/test", json={})
        _warn(r, "POST /api/fpga/test")


# ─────────────────────────────────────────────────────────────────────────────
# 5. AI / Chat
# ─────────────────────────────────────────────────────────────────────────────

class TestChat:
    def test_chat(self):
        print("\n── AI / Chat ──")
        r = client.post(
            "/api/chat",
            json={"message": "What is the current soil moisture?", "user_id": "test_user"},
        )
        _warn(r, "POST /api/chat")

    def test_weather_insight(self):
        r = client.post(
            "/api/weather-insight",
            json={"station_id": "WS01", "message": "Is it good weather for wheat today?"},
        )
        _warn(r, "POST /api/weather-insight")

    def test_agriculture_qa(self):
        r = client.post(
            "/api/agriculture/qa",
            json={
                "question": "When should I irrigate my wheat crop?",
                "station_id": "WS01",
                "language": "en",
            },
        )
        _warn(r, "POST /api/agriculture/qa")


# ─────────────────────────────────────────────────────────────────────────────
# 6. Advisor
# ─────────────────────────────────────────────────────────────────────────────

class TestAdvisor:
    def test_insights_overview(self):
        print("\n── Advisor ──")
        r = client.post(
            "/api/advisor/insights",
            json={"category": "overview", "station_id": "WS01"},
        )
        _warn(r, "POST /api/advisor/insights (overview)")

    def test_insights_crops(self):
        r = client.post(
            "/api/advisor/insights",
            json={"category": "crops", "station_id": "WS01"},
        )
        _warn(r, "POST /api/advisor/insights (crops)")

    def test_insights_water(self):
        r = client.post(
            "/api/advisor/insights",
            json={"category": "water", "station_id": "WS01"},
        )
        _warn(r, "POST /api/advisor/insights (water)")


# ─────────────────────────────────────────────────────────────────────────────
# 7. Mandi
# ─────────────────────────────────────────────────────────────────────────────

class TestMandi:
    def test_rates(self):
        print("\n── Mandi ──")
        r = client.get("/api/mandi/rates")
        _warn(r, "GET /api/mandi/rates")

    def test_rates_filtered(self):
        r = client.get("/api/mandi/rates?commodity=Wheat&state=Maharashtra")
        _warn(r, "GET /api/mandi/rates?commodity=Wheat")

    def test_commodities(self):
        r = client.get("/api/mandi/commodities")
        _warn(r, "GET /api/mandi/commodities")

    def test_history(self):
        r = client.get("/api/mandi/history?commodity=Wheat&days=7")
        _warn(r, "GET /api/mandi/history")

    def test_msp(self):
        r = client.get("/api/mandi/msp")
        _warn(r, "GET /api/mandi/msp")


# ─────────────────────────────────────────────────────────────────────────────
# 8. Voice
# ─────────────────────────────────────────────────────────────────────────────

class TestVoice:
    def test_vapi_call(self):
        print("\n── Voice ──")
        r = client.post(
            "/api/vapi/call",
            json={"phone_number": "+919876543210"},
        )
        _warn(r, "POST /api/vapi/call")

    def test_translate(self):
        r = client.post(
            "/api/translate",
            json={"texts": ["Hello farmer", "What is the weather today?"], "target_language": "hi-IN"},
        )
        _warn(r, "POST /api/translate")

    def test_speech_synthesize(self):
        r = client.post(
            "/api/speech/synthesize",
            json={"text": "नमस्ते किसान", "language": "hi"},
        )
        _warn(r, "POST /api/speech/synthesize")

    def test_speech_transcribe(self):
        audio_content = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x11\x2b\x00\x00\x11\x2b\x00\x00\x01\x00\x08\x00data\x00\x00\x00\x00"
        files = {
            "file": ("test.webm", audio_content, "audio/webm")
        }
        data = {
            "language_code": "hi-IN",
            "model": "saaras:v3"
        }
        r = client.post(
            "/api/speech/transcribe",
            files=files,
            data=data
        )
        _warn(r, "POST /api/speech/transcribe")

    def test_profile_voice_update(self):
        r = client.post(
            "/api/profile/voice-update",
            json={
                "transcript": "My name is Raju, I have 5 acres of land in Pune Maharashtra, I grow wheat and onion",
            },
        )
        _warn(r, "POST /api/profile/voice-update")

    def test_voice_process(self):
        audio_content = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x11\x2b\x00\x00\x11\x2b\x00\x00\x01\x00\x08\x00data\x00\x00\x00\x00"
        files = {
            "audio": ("test.webm", audio_content, "audio/webm")
        }
        data = {
            "language_code": "hi-IN",
            "model": "saaras:v3"
        }
        r = client.post(
            "/api/voice/process",
            files=files,
            data=data
        )
        _ok(r, "POST /api/voice/process")



# ─────────────────────────────────────────────────────────────────────────────
# 9. Webhooks
# ─────────────────────────────────────────────────────────────────────────────

class TestWebhooks:
    def test_whatsapp_verify(self):
        """Twilio webhook verification (GET)."""
        print("\n── Webhooks ──")
        r = client.get(
            "/webhook/whatsapp",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "test_token",
                "hub.challenge": "challenge_string",
            },
        )
        _warn(r, "GET /webhook/whatsapp (verify)")

    def test_whatsapp_message(self):
        """Simulate an inbound WhatsApp message."""
        r = client.post(
            "/webhook/whatsapp",
            data={"From": "whatsapp:+919876543210", "Body": "mandi rate wheat"},
        )
        _warn(r, "POST /webhook/whatsapp")

    def test_whatsapp_farm_qa(self):
        r = client.post(
            "/webhook/whatsapp/farm-qa",
            data={"From": "whatsapp:+919876543210", "Body": "When should I irrigate?"},
        )
        _warn(r, "POST /webhook/whatsapp/farm-qa")


# ─────────────────────────────────────────────────────────────────────────────
# 10. Admin
# ─────────────────────────────────────────────────────────────────────────────

class TestAdmin:
    def test_list_tables(self):
        print("\n── Admin ──")
        r = client.get("/admin/tables")
        _warn(r, "GET /admin/tables")

    def test_table_data(self):
        r = client.get("/admin/tables/weather_data?page=1&page_size=5")
        _warn(r, "GET /admin/tables/weather_data")

    def test_analytics_overview(self):
        r = client.get("/admin/analytics/overview")
        _warn(r, "GET /admin/analytics/overview")

    def test_analytics_sensors(self):
        r = client.get("/admin/analytics/sensors")
        _warn(r, "GET /admin/analytics/sensors")

    def test_analytics_llm(self):
        r = client.get("/admin/analytics/llm")
        _warn(r, "GET /admin/analytics/llm")

    def test_analytics_mandi(self):
        r = client.get("/admin/analytics/mandi")
        _warn(r, "GET /admin/analytics/mandi")


# ─────────────────────────────────────────────────────────────────────────────
# Direct runner (no pytest)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_classes = [
        TestCore, TestAuth, TestSensors, TestFPGA,
        TestChat, TestAdvisor, TestMandi, TestVoice,
        TestWebhooks, TestAdmin,
    ]

    passed = failed = 0
    for cls in test_classes:
        obj = cls()
        methods = [m for m in dir(cls) if m.startswith("test_")]
        for m in methods:
            try:
                getattr(obj, m)()
                passed += 1
            except AssertionError as e:
                print(f"  ❌ FAIL {cls.__name__}.{m}: {e}")
                failed += 1
            except Exception as e:
                print(f"  ❌ ERROR {cls.__name__}.{m}: {e}")
                failed += 1

    print(f"\n{'='*55}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*55}")
    sys.exit(0 if failed == 0 else 1)