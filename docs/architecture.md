# SkyView Smart Agriculture — Architecture

> An end-to-end intelligent agriculture platform combining IoT sensing, multi-agent AI, FPGA hardware acceleration, and a React dashboard with voice interaction.

---

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FIELD LAYER                              │
│   ESP32 + Sensors  ──LoRa──►  Raspberry Pi Gateway             │
│   (temp, humidity, soil,                                        │
│    pressure, UV, PM2.5)                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP POST  /  MQTT
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INGESTION LAYER                            │
│   skyview/ingestion/mqtt_bridge.py   ◄── MQTT broker            │
│   POST /api/sensors/data             ◄── direct HTTP            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SQLAlchemy ORM
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│   PostgreSQL (production)  /  SQLite (dev fallback)            │
│   Tables: weather_data, users, installations,                   │
│            mandi_rates_history, msp_history, alerts             │
│   skyview/data/{db.py, queries.py, schema.py, seed.py}         │
└───────────┬─────────────────────────────┬───────────────────────┘
            │                             │
            ▼                             ▼
┌───────────────────────┐   ┌─────────────────────────────────────┐
│   INTELLIGENCE LAYER  │   │        FPGA ACCELERATION            │
│                       │   │                                     │
│  skyview/agents/      │   │  hardware/ (HLS C++ + Verilog RTL)  │
│  ├─ supervisor.py     │   │  ├─ sensor_fusion (AXI4-Lite)       │
│  │   Multi-agent      │   │  └─ rain_predictor                  │
│  │   orchestration    │   │                                     │
│  ├─ mandi_agent.py    │   │  skyview/api/fpga_routes.py         │
│  │   Live prices +    │   │  ├─ GET  /api/fpga/status           │
│  │   30-min cache     │   │  ├─ POST /api/fpga/fusion           │
│  ├─ fpga_agent.py     │◄──│  ├─ POST /api/fpga/rain-predict     │
│  │   Software sim     │   │  └─ POST /api/fpga/combined-analysis│
│  └─ agricultural_qa.py│   │                                     │
│      Crop Q&A engine  │   │  ENABLE_FPGA=True → real UART       │
│                       │   │  ENABLE_FPGA=False → software sim   │
│  skyview/utils/       │   └─────────────────────────────────────┘
│  └─ llm_pool.py       │
│      Groq round-robin │
│      multi-key LB     │
└───────────┬───────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
│                   skyview/main.py  (FastAPI)                    │
│                                                                 │
│  System       GET  /            GET  /health                    │
│               GET  /api/llm-pool                                │
│                                                                 │
│  Sensors      POST /api/sensors/data      ← hardware ingest     │
│               GET  /api/sensors/latest/{station_id}             │
│               GET  /api/sensors/history/{station_id}            │
│               GET  /api/sensors/stations                        │
│               POST /api/sensors/trends/store                    │
│                                                                 │
│  Auth         POST /api/auth/send-otp                           │
│               POST /api/auth/verify-otp                         │
│               POST /api/auth/signup                             │
│                                                                 │
│  AI / Chat    POST /api/chat                                    │
│               POST /api/weather-insight                         │
│               POST /api/agriculture/qa                          │
│                                                                 │
│  Advisor      POST /api/advisor/insights                        │
│               (categories: overview|crops|water|                │
│                tips|soil|pests|alerts)                          │
│                                                                 │
│  Mandi        GET  /api/mandi/rates                             │
│               GET  /api/mandi/commodities                       │
│               GET  /api/mandi/history                           │
│               GET  /api/mandi/msp                               │
│                                                                 │
│  Profile      GET  /api/profile                                 │
│               POST /api/profile/save                            │
│               POST /api/profile/voice-update                    │
│                                                                 │
│  Schemes      GET  /api/schemes/recommendations                 │
│                                                                 │
│  Marketplace  POST /api/marketplace/match                       │
│                                                                 │
│  Voice        POST /api/vapi/call                               │
│               POST /api/speech/synthesize                       │
│               POST /api/speech/transcribe                       │
│               POST /api/translate                               │
│                                                                 │
│  Webhooks     GET  /webhook/whatsapp    ← Twilio verify         │
│               POST /webhook/whatsapp    ← inbound message       │
│               POST /webhook/whatsapp/farm-qa                    │
│                                                                 │
│  Admin        GET  /admin/tables                                │
│               GET  /admin/tables/{table}                        │
│               GET  /admin/analytics/overview                    │
│               GET  /admin/analytics/sensors                     │
│               GET  /admin/analytics/llm                         │
│               GET  /admin/analytics/mandi                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │  JSON / REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                             │
│   React 18 + Vite + TypeScript + Tailwind CSS                   │
│                                                                 │
│   Pages:                                                        │
│   ├─ Landing / Login / Signup                                   │
│   ├─ Dashboard      ← live sensors, system health              │
│   ├─ Trends         ← 24h charts (temp, humidity, rain)        │
│   ├─ Advisor        ← AI crop/water/soil/pest insights         │
│   ├─ Mandi Rates    ← live commodity prices                    │
│   ├─ Marketplace    ← buyer/seller matching                    │
│   ├─ Profile        ← farmer profile + govt schemes            │
│   ├─ Reports        ← downloadable sensor reports              │
│   ├─ AI Hardware    ← FPGA accelerator interface               │
│   └─ Chat           ← multi-agent conversational AI            │
│                                                                 │
│   Key files:                                                    │
│   src/lib/weatherData.ts  — sensor data fetching + mapping     │
│   src/context/AuthContext.tsx — OTP auth state                 │
│   vite.config.ts — dev proxy → localhost:8000                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Reference

### `skyview/` (Python package root)

| Path | Purpose |
|------|---------|
| `main.py` | FastAPI app factory; registers all routers |
| `utils/config.py` | All env vars in one `Settings` class; `lru_cache` singleton |
| `utils/logger.py` | Structured logging setup |
| `utils/llm_pool.py` | Round-robin load balancer across multiple Groq API keys |

### `skyview/data/`

| File | Purpose |
|------|---------|
| `db.py` | SQLAlchemy engine + session factory; PostgreSQL with SQLite fallback |
| `schema.py` | `CREATE TABLE IF NOT EXISTS` for all tables |
| `queries.py` | Reusable query helpers (`get_latest_weather`, `get_weather_history`, etc.) |
| `seed.py` | Full seed data (mandi history, MSP, installations) |
| `seed_fast.py` | Lightweight seed for CI / quick dev startup |

### `skyview/api/`

| File | Prefix | Key routes |
|------|--------|-----------|
| `core_routes.py` | — | `/`, `/health`, `/api/llm-pool` |
| `sensor_routes.py` | `/api/sensors` | data ingest, latest, history, stations, trends/store |
| `auth_routes.py` | `/api/auth` | send-otp, verify-otp, signup |
| `chat_routes.py` | — | `/api/chat`, `/api/weather-insight`, `/api/agriculture/qa` |
| `advisor_routes.py` | `/api/advisor` | `/insights` (7 categories) |
| `mandi_routes.py` | `/api/mandi` | rates, commodities, history, msp |
| `profile_routes.py` | — | `/api/profile`, `/api/profile/save`, `/api/schemes/recommendations` |
| `marketplace_routes.py` | `/api/marketplace` | `/match` |
| `voice_routes.py` | — | vapi/call, speech/synthesize, translate, profile/voice-update |
| `fpga_routes.py` | `/api/fpga` | status, fusion, rain-predict, combined-analysis, test |
| `webhook_routes.py` | `/webhook` | whatsapp GET/POST, whatsapp/farm-qa |

### `skyview/agents/`

| File | Role |
|------|------|
| `supervisor.py` | Top-level multi-agent orchestrator; routes queries to specialist agents |
| `mandi_agent.py` | Fetches live prices from data.gov.in API; 30-min in-memory cache |
| `fpga_agent.py` | Software simulation of FPGA sensor fusion and rain prediction |
| `agricultural_qa.py` | Structured farm Q&A using LLM + live sensor context |

### `skyview/admin/`

| File | Role |
|------|------|
| `admin_routes.py` | Raw table browser + analytics endpoints for monitoring |

---

## Data Models (Database Tables)

```sql
users               -- farmer profiles (phone PK)
installations       -- registered weather stations
installation_sensors -- sensor types per station
weather_data        -- time-series sensor readings (main table)
alerts              -- threshold breach events
mandi_rates_history -- historical commodity prices (seeded)
msp_history         -- minimum support price records (seeded)
```

---

## Key Design Decisions

### LLM Load Balancing
`llm_pool.py` accepts a comma-separated `GROQ_API_KEYS` list and distributes requests round-robin. If a key fails (rate limit / error), it falls back to the next key automatically. This avoids hitting per-key rate limits on free-tier Groq accounts.

### FPGA Dual-Mode
`ENABLE_FPGA=False` (default) runs pure Python simulation of the HLS sensor fusion and rain prediction algorithms — identical outputs, no hardware required. Set `ENABLE_FPGA=True` only when a ZC706 board is physically connected via the configured serial port.

### Database Fallback
`DATABASE_URL` not set → SQLite at `sensor_data.db`. Set it to any PostgreSQL URL (Neon, Supabase, Railway, local Docker) for production. Neon URLs get `sslmode=require` appended automatically.

### Frontend Dev Proxy
`vite.config.ts` proxies all `/api`, `/admin`, `/webhook` requests to `http://localhost:8000` during development. `VITE_API_URL` is left empty in `.env.local`. For production deployments, set `VITE_API_URL` to the backend's public URL, or use the nginx reverse proxy in `infra/nginx.conf`.

### Sensor Ingestion Dual Format
`POST /api/sensors/data` accepts both:
- **Nested format**: ESP32 hardware JSON `{id, ts, env:{t,h,p}, wind:{s,d}, ...}`
- **Flat format**: direct HTTP `{station_id, temperature, humidity, ...}`

Auto-detected from the request body shape.

---

## Infrastructure

```
infra/
├── Dockerfile.backend    # Python 3.11-slim + uvicorn; CMD: skyview.main:app
├── Dockerfile.frontend   # Node 20 build → nginx:alpine serve
├── requirements.txt      # All Python dependencies (pinned)
├── mosquitto.conf        # Mosquitto MQTT broker config
└── nginx.conf            # Reverse proxy + SPA fallback for frontend container

docker-compose.yml        # Orchestrates: db + mqtt + backend (+ optional frontend)
run.sh                    # Local dev runner (venv + schema init + uvicorn)
.env.example              # All configurable variables with descriptions
```

---

## External Services

| Service | Purpose | Required? |
|---------|---------|-----------|
| Groq | LLM inference (llama-3.1-8b-instant) | Yes (AI features) |
| data.gov.in | Live mandi commodity prices | Yes (live mandi) |
| Vapi.ai | Outbound voice calls to farmers | Optional |
| Sarvam AI | Indian language TTS + translation | Optional |
| Twilio | WhatsApp inbound/outbound messaging | Optional |
| PostgreSQL | Production database | Recommended |