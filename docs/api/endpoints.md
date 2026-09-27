# 📚 Complete FastAPI Route & Endpoint Reference

SkyView exposes **18 production-ready route modules** serving all telemetry, artificial intelligence, and marketplace operations.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/send-otp`
Generates and delivers a 6-digit OTP code to Indian mobile numbers.
- **Request Body:**
  ```json
  {
    "phone": "+919876543210",
    "is_signup": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "OTP sent to +91 XXXXX X3210",
    "sms_sent": true
  }
  ```

### `POST /api/auth/verify-otp`
Validates user-submitted OTP and issues an authentication session token.
- **Request Body:**
  ```json
  {
    "phone": "+919876543210",
    "otp": "481923"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "token": "mock_jwt_+919876543210"
  }
  ```

---

## 2. Sensor & IoT Telemetry Endpoints (`/api/sensors`)

### `GET /api/sensors/current`
Returns the latest environmental and soil metrics from the active AgriSense WS01 station.
- **Query Parameters:** `station_id` (optional, default: `WS01`)
- **Response (200 OK):**
  ```json
  {
    "station_id": "WS01",
    "timestamp": "2026-09-27T14:10:00Z",
    "temperature": 28.4,
    "humidity": 68.2,
    "soil_moisture": 42.5,
    "pressure": 1013.2,
    "wind_speed": 3.8,
    "rainfall": 0.0,
    "uv_index": 5.4,
    "light": 48200
  }
  ```

### `GET /api/sensors/history`
Retrieves time-series telemetry records for charts and trend forecasting.
- **Query Parameters:** `hours` (integer, default: `24`), `station_id` (default: `WS01`)

### `POST /api/sensors/ingest`
Ingestion endpoint for ESP32 LoRaWAN gateways to deposit encrypted field telemetry packets.

---

## 3. Agricultural AI Advisor (`/api/advisor`)

### `POST /api/advisor/chat`
Submits agricultural questions to the multi-tier LLM mesh with automatic multilingual routing.
- **Request Body:**
  ```json
  {
    "prompt": "What fertilizer ratio should I use for wheat top-dressing in 2nd irrigation?",
    "language": "hi",
    "farmer_context": {
      "crop": "Wheat (HD-2967)",
      "land_acres": 4.5,
      "state": "Punjab"
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "provider_used": "Groq LLaMA 3.3 70B",
    "latency_ms": 384,
    "response": "गेहूं में दूसरी सिंचाई (40-45 दिन बाद) के समय यूरिया की शीर्ष ड्रेसिंग (Top Dressing)..."
  }
  ```

---

## 4. Live Mandi Commodity Rates (`/api/mandi`)

### `GET /api/mandi/rates`
Fetches real-time commodity prices from the official Indian Agricultural Ministry repository (`data.gov.in`).
- **Query Parameters:**
  - `commodity`: e.g. `Wheat`, `Mustard`, `Cotton`, `Soyabean`
  - `state`: e.g. `Maharashtra`, `Punjab`, `Madhya Pradesh`
  - `district`: optional district filter

---

## 5. Hardware-Accelerated FPGA Diagnostics (`/api/fpga`)

### `GET /api/fpga/status`
Queries the hardware register status of the AMD Xilinx Vivado HLS kernel.
- **Response (200 OK):**
  ```json
  {
    "status": "online",
    "core": "Xilinx Vivado HLS v2024.1",
    "device": "PYNQ-Z2 / Kria KV260",
    "clock_mhz": 100.0,
    "latency_ns": 420,
    "registers": {
      "ET0_COMPUTE": "ACTIVE",
      "VPD_COMPUTE": "ACTIVE",
      "RISK_EVALUATOR": "ACTIVE"
    }
  }
  ```

---

## 6. Smart Cooperative Marketplace (`/api/marketplace`)

### `GET /api/marketplace/bilateral`
Returns 2-party complementary resource matches sorted by Haversine distance.

### `GET /api/marketplace/circular-loops`
Runs directed cycle traversal to find 3-party closed barter loops (e.g. Tractor ➔ Harvester ➔ Labor ➔ Tractor).

### `POST /api/marketplace/negotiate`
Launches the AI Deal Broker to calculate fair transit offsets and generate pre-filled WhatsApp agreement links.
