# 🌾 AgriN: Regenerative Agricultural Intelligence & Interoperable Digital Public Good

[![Build with AI: Code for Communities](https://img.shields.io/badge/Hackathon-Build%20with%20AI%3A%20Code%20for%20Communities%20(2nd%20Edition)-4285F4?style=for-the-badge&logo=google)](https://codeforcommunities.devpost.com/)
[![Track](https://img.shields.io/badge/Track-Track%204%3A%20AgriN%20%26%20Regenerative%20Agricultural%20Intelligence-34A853?style=for-the-badge)](https://codeforcommunities.devpost.com/)
[![BRICS Theme](https://img.shields.io/badge/Theme-BRICS%20Cooperation%20%26%20Digital%20Public%20Goods-FBBC05?style=for-the-badge)](https://brics2024.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-EA4335?style=for-the-badge)](LICENSE)

---

## 🎯 Hackathon & Track Context

- **Hackathon:** **Build with AI: Code for Communities — Second Edition**
- **Track:** **Track 4 — AgriN & Regenerative Agricultural Intelligence**
- **BRICS Theme:** **Cooperation**

### 🌍 The Problem
Small and marginal farmers across emerging economies lack access to timely, data-driven agricultural guidance. Relying on traditional guesswork instead of real-time satellite data, soil health analytics, and climate forecasting leads to frequent crop failure, soil degradation, and threats to regional food security. Furthermore, the absence of shared, interoperable digital infrastructure blocks cross-border collaboration on climate-resilient and regenerative farming practices across the Global South and BRICS partner nations.

### 💡 The Solution: AgriN
Inspired by the **BRICS AgriN initiative**, our platform builds an **interoperable digital public good** that delivers localized, real-time agro-advisories powered by edge IoT telemetry, high-throughput AI models, and cooperative resource pooling networks:
1. **Regenerative Crop & Soil Recommendations:** Ingests live soil moisture, ambient humidity, temperature, and atmospheric pressure to recommend regenerative crop rotation schedules and organic soil amendment plans.
2. **Multi-Agent Agro-Advisory Network:** High-availability LLM inference engine (powered by Groq Qwen 3.8 & Gemini 2.5 failover) providing voice and text intelligence across 10+ regional languages.
3. **Hyperlocal Weather Insights:** Edge-driven climate forecasting that translates raw sensor telemetry into actionable, prioritized daily field actions.
4. **Cooperative Resource Marketplace & Regional Geo-Mapping:** Interoperable barter and pooling algorithms that connect neighboring smallholders to share tractors, harvesters, compost, and agricultural machinery.
5. **Verified Welfare Schemes Catalog:** Centralized, resilient discovery of agricultural welfare schemes, subsidies, and credit cards with direct integration to national portals (MyScheme.gov.in).
6. **Hardware-Accelerated Sensor Fusion:** Edge FPGA acceleration (Xilinx ZC706 / HLS) providing ultra-low-latency (12ms) inference for early anomaly detection and crop health scoring.

---

## 🏗️ Architecture Overview

```
                                ┌───────────────────────────────────────────────┐
                                │          BRICS AgriN Digital Public Good     │
                                └───────────────────────────────────────────────┘
                                                       │
                   ┌───────────────────────────────────┼───────────────────────────────────┐
                   ▼                                   ▼                                   ▼
        ┌───────────────────────┐           ┌───────────────────────┐           ┌───────────────────────┐
        │   Web Application     │           │   Native Mobile App   │           │ Voice & Telephony Bot │
        │ (React 18 + Vite + TS)│           │ (Flutter + Voice SDK) │           │ (Sarvam AI + Twilio)  │
        └───────────────────────┘           └───────────────────────┘           └───────────────────────┘
                   │                                   │                                   │
                   └───────────────────────────────────┼───────────────────────────────────┘
                                                       │  REST / WebSockets / SSE
                                                       ▼
                                    ┌─────────────────────────────────────┐
                                    │    FastAPI Central Agro-Backend     │
                                    │      (Python 3.11+ / AsyncIO)       │
                                    └─────────────────────────────────────┘
                                                       │
         ┌─────────────────────┬───────────────────────┼───────────────────────┬─────────────────────┐
         ▼                     ▼                       ▼                       ▼                     ▼
┌─────────────────┐   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   ┌─────────────────┐
│ AI Model Pool   │   │ PostgreSQL      │     │ Mandi Rates API │     │ Government      │   │ Edge Hardware   │
│ Groq Qwen 3.8 + │   │ Neon Serverless │     │ Data.gov.in     │     │ Schemes Catalog │   │ ZC706 FPGA /    │
│ Gemini 2.5 Flash│   │ IoT Time-series │     │ Market Indices  │     │ MyScheme Portal │   │ HLS Acceleration│
└─────────────────┘   └─────────────────┘     └─────────────────┘     └─────────────────┘   └─────────────────┘
```

---

## 🌟 Key Features

| Module | Description | Technical Stack |
| :--- | :--- | :--- |
| **Current Farm Intelligence** | Real-time agro-climatic summary, focus points, and diagnostic telemetry from active sensor nodes. | FastAPI, LangChain, Groq, Gemini 2.5 |
| **Interactive India Farmers Map** | Live Leaflet & OpenStreetMap geographic distribution map of farmers, active crops, and shared resources. | Leaflet, OpenStreetMap, GeoJSON |
| **AI Farm Voice Assistant** | Multi-step agentic voice orchestrator with intent classification and speech-to-text / text-to-speech. | Sarvam AI, Web Audio API, NDJSON Streaming |
| **Today's Weather Insights** | 5 prioritized daily agricultural recommendations computed directly from ambient conditions. | LLM Pool, OpenWeatherMap, Sensor Fusion |
| **Welfare Schemes Engine** | Profile-matched subsidy recommendations with verified links to official government portals. | PostgreSQL, MyScheme API |
| **Marketplace & Circular Pooling** | Haversine distance-based resource matching and circular barter loops between producers and consumers. | NumPy, Python Algorithms, Lucide React |
| **Edge Hardware Diagnostics** | FPGA hardware pipeline telemetry with latency and neural confidence metrics. | Xilinx Vivado HLS, Python Serial Bridge |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- Git

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/vvinayakkk/brics-agrin-platform.git
cd brics-agrin-platform

# Create and activate virtual environment
python -m venv myenv
source myenv/bin/activate  # On Windows: .\myenv\Scripts\activate

# Install dependencies
pip install -r infra/requirements.txt

# Run backend locally
uvicorn skyview.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be live at: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)

### 2. Frontend Setup
```bash
cd frontend

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

Frontend will be live at: `http://localhost:5173`

---

## 🔐 Environment Variables

### Backend (`skyview/.env` / Render Dashboard)
```env
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
GROQ_API_KEYS=gsk_...
GEMINI_API_KEY=AQ...
SARVAM_AI_API_KEY=sk_...
DATAGOV_API_KEY=...
STATION_ID=WS01
ENABLE_FPGA=False
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env` / Vercel Dashboard)
```env
VITE_API_URL=https://<your-render-backend-url>
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

---

## 🏆 BRICS Digital Public Good Alignment

1. **Interoperability:** Standardized REST APIs, OpenStreetMap tile integration, and JSON telemetry contracts allow seamless ingestion across any agricultural ministry or regional cooperative.
2. **Multilingual Inclusion:** Native support for Hindi, Telugu, Tamil, Marathi, Gujarati, Bengali, Kannada, Malayalam, and Punjabi via Sarvam AI.
3. **Resilience & Offline First:** Graceful offline fallbacks across every card, map, and telemetry insight ensure farmers are never stranded by connectivity interruptions.
4. **Data Sovereignty:** Designed to deploy on sovereign cloud infrastructure (Render, Docker, Kubernetes) with open database schemas.

---

## 👥 Contributors & Pairing

Developed with dedication for **Build with AI: Code for Communities — Second Edition**.
- Team AgriN / SkyView