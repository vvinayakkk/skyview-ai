# 📱 SkyView Mobile Application Development & Setup

This document details the architecture, setup instructions, and developer practices used in the SkyView Flutter Mobile Application. The mobile app serves as a core multilingual, voice-interactive client for the SkyView platform, designed for field use by Indian farmers.

---

## 🛠 Feature Overview

The mobile application acts as the primary field interface for farmers, providing:
* **Multilingual Farm Advisory Chat**: Connects to the SkyView FastAPI backend to consult specialist AI agents for crop advice, soil health, and pest management.
* **Live Mandi Rates Index**: Displays real-time commodity prices from `data.gov.in`, price trends, and buyer-matching indicators.
* **Telemetry Dashboard & Trends**: Visualizes live sensor readings (temperature, soil moisture, UV index, PM2.5) from the station.
* **Government Schemes Recommendations**: Recommends eligible schemes based on the farmer's land size, location, and cultivated crops.
* **Voice-First Interaction**: Allows hands-free operation using built-in speech-to-text and language translations.
* **Farm Intelligence Reports**: Triggers the generation of PDF summary digests directly from telemetry.

---

## 🏗 Tech Stack & Dependencies

* **Framework**: Flutter (Dart)
* **State Management**: Riverpod (`flutter_riverpod`)
* **Network Client**: Http (`http`) & Dio (`dio`)
* **Localization**: `easy_localization` (supporting English, Hindi, and regional languages)
* **UI Utilities**: Google Fonts, Flutter Markdown, and Lottie animations

---

## 📦 Setup & Installation

### Prerequisites
* Flutter SDK (`>= 3.4.0 < 4.0.0`)
* Android SDK (minimum API level 21)

### Local Dev Setup

1. **Get Dependencies**:
   ```bash
   cd skyview_flutter_app/skyview_flutter
   flutter pub get
   ```
2. **Run Application**:
   Ensure you have an emulator open or a physical device connected via ADB, then run:
   ```bash
   flutter run
   ```
3. **Compile Release APK**:
   ```bash
   flutter build apk --release
   ```

---

## 🌟 Best Practices Used

* **Clean Architecture**: Strictly separates views (`lib/screens`), global controllers/providers (`lib/services`), and shared utilities.
* **Smooth Load States**: Implements shimmer loading states and skeleton loaders to enhance perceptual performance.
* **Adaptive Theme Support**: Full support for light and dark modes matching the desktop web experience.
