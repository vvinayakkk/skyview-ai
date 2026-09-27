# 🌾 SkyView AG-RIN Documentation Hub

Welcome to the **SkyView AG-RIN** technical documentation. This documentation repository provides end-to-end architectural, engineering, hardware, deployment, and contribution specifications for the SkyView Agricultural Intelligence Platform.

---

## 📚 Documentation Table of Contents

```
docs/
├── README.md                      # Documentation Index (this file)
├── architecture/                  # Deep architectural specifications
│   ├── system-overview.md         # End-to-end platform topology & data flow
│   ├── edge-and-fpga.md           # FPGA hardware acceleration & LoRaWAN edge
│   └── ai-mesh.md                 # Multi-Tier LLM consensus network & agents
├── api/                           # Backend API documentation
│   ├── overview.md                # Authentication, base URLs, and protocols
│   ├── endpoints.md               # Complete 18-route REST endpoint reference
│   └── websocket-and-webhooks.md  # Real-time telemetry & IoT webhooks
├── hardware/                      # Embedded systems & hardware engineering
│   ├── agrisense-ws01.md          # AgriSense WS01 weather station BOM & pinout
│   ├── firmware-and-lora.md       # ESP32 firmware & LoRa packet encoding
│   └── vivado-hls-guide.md        # Vivado HLS C++ synthesis & FPGA bitstream
├── mobile/                        # Flutter Android application
│   ├── flutter-architecture.md    # Riverpod state management & offline-first
│   ├── setup-and-build.md         # Local SDK setup & APK compilation
│   └── ci-release-pipeline.md     # GitHub Actions release automation
├── deployment/                    # Cloud infrastructure & operations
│   ├── cloud-infrastructure.md    # Render, Vercel, and Neon PostgreSQL setup
│   ├── docker-guide.md            # Containerized orchestration & compose
│   └── ci-cd-pipelines.md         # GitHub Actions workflows & SonarCloud
└── contributing/                  # Developer guides & standards
    ├── guide.md                   # Getting started with contributions
    ├── git-workflow.md            # Git branching model & commit standards
    ├── pull-requests.md           # PR lifecycle & submission checklist
    ├── branch-protection.md       # GitHub branch protection rules configuration
    └── code-quality.md            # SonarQube Quality Gate & security rules
```

---

## ⚡ Quick Navigation

| Area | Description | Primary Document |
| :--- | :--- | :--- |
| **System Architecture** | High-level data pipelines, database schema & consensus | [`docs/architecture/system-overview.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/architecture/system-overview.md) |
| **Hardware & FPGA** | AgriSense WS01 station, ESP32, and Vivado HLS | [`docs/hardware/agrisense-ws01.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/hardware/agrisense-ws01.md) |
| **Backend REST API** | FastAPI route schemas, payloads, and Fast2SMS auth | [`docs/api/endpoints.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/api/endpoints.md) |
| **Mobile App (Flutter)** | Riverpod controllers, i18n, voice, APK release | [`docs/mobile/flutter-architecture.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/mobile/flutter-architecture.md) |
| **Cloud Deployment** | Render web services, Vercel frontend, Docker | [`docs/deployment/cloud-infrastructure.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/deployment/cloud-infrastructure.md) |
| **Contributing** | Branching, Pull Requests, SonarQube, Branch Protection | [`docs/contributing/guide.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/contributing/guide.md) |
