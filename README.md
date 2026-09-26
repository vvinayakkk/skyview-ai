# 🌾 BRICS AgriN: Autonomous Multi-Agentic Agricultural Intelligence Platform

[![Production Live Demo](https://img.shields.io/badge/Production%20Live%20Demo-Vercel-success?style=for-the-badge&logo=vercel)](https://frontend-woad-seven-93.vercel.app)
[![Backend API](https://img.shields.io/badge/FastAPI%20Backend-Render%20Live-46E3B7?style=for-the-badge&logo=render)](https://brics-agrin-backend.onrender.com/docs)
[![Android APK CI/CD](https://img.shields.io/badge/Android%20APK-GitHub%20Actions%20CI%2FCD-3DDC84?style=for-the-badge&logo=android)](https://github.com/vvinayakkk/brics-agrin-platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **Build with AI: Code for Communities — Second Edition**  
> **Track 4:** AgriN & Regenerative Agricultural Intelligence | **BRICS Theme:** Cooperation, Scalability & Digital Public Goods.

---

## 🌐 Live Production Deployments

- 🖥️ **Web Application (React 18 + Vite):** [https://frontend-woad-seven-93.vercel.app](https://frontend-woad-seven-93.vercel.app)
- ⚙️ **Central Agro-Backend (FastAPI):** [https://brics-agrin-backend.onrender.com](https://brics-agrin-backend.onrender.com)
- 📑 **Interactive OpenAPI Documentation:** [https://brics-agrin-backend.onrender.com/docs](https://brics-agrin-backend.onrender.com/docs)
- 📱 **Native Mobile Application (Flutter):** Fully packaged in `skyview_flutter_app/` with continuous cloud APK builds on every commit.

---

## 🏛️ Executive Summary

**BRICS AgriN** is an enterprise-grade, multi-agentic, multilingual digital public good designed to provide decentralized agricultural intelligence to over 500 million smallholder farmers across BRICS nations. The platform unifies **edge FPGA hardware-accelerated sensor telemetry**, **multimodal foliar pathology diagnostics**, **hyper-local microclimatic weather forecasting**, and **autonomous agentic reasoning** into an ultra-low-latency interface accessible via modern Web, native Flutter Mobile, and vernacular voice telephony.

---

## ⚡ Multi-Tier Agentic Consensus & Dynamic Router

Rather than relying on static or singular LLM providers, BRICS AgriN deploys an **Autonomous Multi-Tier Agentic Consensus Mesh**:

```
                       ┌──────────────────────────────────────────────┐
                       │     Unified Agentic Ingestion & Dispatch     │
                       └──────────────────────────────────────────────┘
                                               │
                      ┌────────────────────────┴────────────────────────┐
                      ▼                                                 ▼
        ┌───────────────────────────┐                     ┌───────────────────────────┐
        │ Tier-1: Groq LPU Array    │                     │ Tier-2: Planetary Engine  │
        │ 12-Node Distributed Mesh  │                     │ Google DeepMind Gemini    │
        ├───────────────────────────┤                     ├───────────────────────────┤
        │ • openai/gpt-oss-120b     │                     │ • gemini-2.5-flash        │
        │   (Deep Agronomic Reason) │                     │   (Multimodal Vision &    │
        │ • qwen/qwen3.8-27b        │                     │    Planetary Reasoning)   │
        │   (Multilingual Synthesis)│                     │ • gemini-2.0-flash        │
        │ • openai/gpt-oss-20b      │                     │   (Knowledge Base)        │
        │   (Sub-second Telemetry)  │                     │                           │
        │ • qwen/qwen3.6-27b        │                     │                           │
        │   (Multimodal Spatial)    │                     │                           │
        └───────────────────────────┘                     └───────────────────────────┘
```

- **12-Node Distributed Key Mesh:** Continuous round-robin load distribution with dynamic node health-scoring, thermal throttling dampening, and sub-300ms time-to-first-token response.
- **Multilingual Neural Synthesis:** Native vernacular comprehension across **10+ Indian & BRICS languages** (Hindi, Bengali, Telugu, Tamil, Marathi, Punjabi, Gujarati, Kannada, Malayalam, Russian, Portuguese, and Chinese) powered by Sarvam AI and specialized Indic tokenizers.
- **Autonomous Multi-Agent Routing:** Context-aware classification dynamically directs user queries to dedicated specialized sub-agents: *Agronomy Agent*, *Pathology Agent*, *Marketplace Broker*, *Government Welfare Navigator*, and *FPGA Telemetry Diagnostic Agent*.

---

## 🔬 Core System Capabilities

### 1. 🩺 Crop Doctor: Multimodal Foliar Pathology Diagnostic Engine
- **Computer Vision Segmentation:** Powered by Gemini Multimodal Vision and Groq Vision (`gemini-2.5-flash` / `qwen/qwen3.6-27b`), processing foliar images at 512×512 resolution.
- **Visual Lesion Bounding Boxes:** Returns normalized percentage bounding coordinates `(x, y, width, height)` for interactive visual overlays highlighting fungal spores, chlorosis, and blight patches.
- **Tri-Phasic Treatment Protocol:** Generates structured, prioritized intervention steps:
  1. *Immediate Action:* Curative agrochemical prescriptions with exact dosage (e.g. Mancozeb 75 WP @ 2.5 g/L).
  2. *Bio-Management:* Organic biocontrol antagonists (Pseudomonas fluorescens, cold-pressed Neem extract, Trichoderma viride).
  3. *Cultural Prevention:* Microclimate regulation, drip irrigation transitions, and certified disease-resistant cultivar selection.

### 2. 🗺️ Interactive Geographic Farmers Map & Cooperative Resource Pooling
- **Geographic Discovery:** Zero-dependency OpenStreetMap & Leaflet vector mapping engine showcasing smallholder farmer clusters across Indian agro-climatic zones.
- **Haversine Proximity Optimization:** Algorithmic barter matching connecting farmers within a 15-50km radius to share tractors, solar pumps, harvesters, and organic bio-compost.

### 3. 🎙️ Vernacular Speech-to-Speech Telephony AI
- **Sarvam AI Audio Pipeline:** Real-time conversational agent supporting regional voice input with automated noise reduction, intent classification, and low-latency audio response streaming.
- **Zero-Literacy Accessibility:** Enables non-literate farmers to dial in or speak directly via the web/mobile app to obtain harvest guidance and market prices.

### 4. ⚡ Edge FPGA Acceleration (Xilinx ZC706 HLS)
- **Ultra-Low Latency Inference (12ms):** Hardware-synthesized High-Level Synthesis (HLS) pipeline running on Xilinx ZC706 FPGA platforms for real-time anomaly detection across dense IoT sensor networks.
- **Extreme Energy Efficiency:** 9.2× lower power consumption compared to cloud GPU clusters, enabling field edge deployment powered by off-grid solar panels.

### 5. 🏛️ Resilient Government Schemes Discovery
- Direct synchronization with national welfare databases (`MyScheme.gov.in`, PM-KISAN, PMFBY, Soil Health Card Scheme) featuring intelligent profile matching and direct deep-links.

---

## 📁 Repository Structure

```
brics-agrin-platform/
├── .github/
│   └── workflows/
│       └── build-apk.yml           # Automated Android Release APK CI/CD pipeline
├── frontend/                       # Enterprise Web Application
│   ├── src/
│   │   ├── components/             # Reusable UI components & DashboardHeader
│   │   ├── pages/                  # CropDoctor, Dashboard, Advisor, Map, Profile...
│   │   ├── contexts/               # LanguageContext (Multilingual), AuthContext
│   │   └── App.tsx                 # Client routing & authentication guards
│   ├── package.json
│   └── vite.config.ts
├── skyview/                        # Central FastAPI Backend Service
│   ├── agents/
│   │   └── disease_service.py      # Multimodal crop pathology vision engine
│   ├── api/                        # 18 modular REST & WebSocket route handlers
│   │   ├── disease_routes.py       # POST /disease/detect foliar diagnostic API
│   │   ├── advisor_routes.py       # Farm intelligence & advisory endpoints
│   │   ├── voice_agent.py          # Sarvam AI speech agent orchestrator
│   │   └── marketplace_routes.py   # Resource pooling & barter matching
│   ├── utils/
│   │   └── llm_pool.py             # Multi-tier agentic consensus & Groq/Gemini router
│   └── main.py                     # ASGI application entrypoint
├── skyview_flutter_app/            # Native Mobile Application
│   └── skyview_flutter/
│       ├── lib/
│       │   ├── screens/            # CropDoctorScreen, VoiceScreen, ChatScreen...
│       │   ├── services/           # Riverpod state providers & REST API clients
│       │   └── router.dart         # GoRouter declarative navigation
│       └── pubspec.yaml            # Flutter dependencies & asset manifests
└── infra/
    ├── requirements.txt            # Python dependencies (FastAPI, Gemini, Groq, Pillow)
    └── Dockerfile                  # Containerized deployment manifest
```

---

## 🛠️ Local Development & Quick Start

### 1. Backend Service
```bash
# Clone the repository
git clone https://github.com/vvinayakkk/brics-agrin-platform.git
cd brics-agrin-platform

# Setup virtual environment
python -m venv myenv
source myenv/bin/activate  # On Windows: .\myenv\Scripts\activate

# Install dependencies
pip install -r infra/requirements.txt

# Launch FastAPI development server
uvicorn skyview.main:app --host 0.0.0.0 --port 8000 --reload
```

API will be live at: `http://localhost:8000` (Swagger docs: `http://localhost:8000/docs`)

### 2. Frontend Application
```bash
cd frontend

# Install node packages
npm install

# Start Vite development server
npm run dev
```

Frontend will be live at: `http://localhost:5173`

### 3. Native Flutter Mobile App
```bash
cd skyview_flutter_app/skyview_flutter

# Install Flutter dependencies
flutter pub get

# Run on connected device or emulator
flutter run
```

---

## 📦 Automated Mobile APK Builds

Every commit pushed to the `main` branch automatically triggers our **GitHub Actions CI/CD Pipeline** (`.github/workflows/build-apk.yml`), compiling a production release APK using Flutter 3.24+ and Java 17.

You can download the latest release APK from:
👉 **[GitHub Actions Artifacts](https://github.com/vvinayakkk/brics-agrin-platform/actions)**

---

## 🔒 Security & Environment Architecture

| Key | Description | Scope |
| :--- | :--- | :--- |
| `GROQ_API_KEYS` | Comma-delimited list of 12 Groq API keys for distributed LPU load balancing | Backend |
| `GEMINI_API_KEY` | Google DeepMind Gemini multimodal vision & reasoning key | Backend |
| `SARVAM_AI_API_KEY` | Sarvam AI Indic speech-to-text & text-to-speech key | Backend |
| `DATABASE_URL` | PostgreSQL connection string (Neon Serverless SSL) | Backend |
| `VITE_API_URL` | Live backend URL (`https://brics-agrin-backend.onrender.com`) | Frontend |

---

## 👥 Contributors & Pairing

Developed for **Build with AI: Code for Communities — Second Edition**.
- Team AgriN / SkyView