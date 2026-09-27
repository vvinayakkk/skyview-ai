# 📱 Flutter Mobile Application Architecture

The SkyView mobile client is engineered in **Flutter 3.24.3** with Dart 3.5.3, providing an offline-first, multilingual, voice-interactive experience tailored for Indian farming communities.

---

## 🏗️ Architectural Pattern: Feature-First + Riverpod

```
skyview_flutter_app/skyview_flutter/lib/
├── main.dart                      # App entrypoint & ProviderScope
├── core/
│   ├── constants/                 # Color schemes, typography, API URLs
│   ├── network/                   # Dio HTTP client, interceptors, retry policy
│   └── storage/                   # Local storage & user profile tokens
├── providers/                     # Riverpod state providers
│   ├── auth_provider.dart         # Authentication & OTP verification
│   ├── sensor_provider.dart       # Live weather station telemetry stream
│   ├── mandi_provider.dart        # Commodity pricing & mandi market state
│   └── voice_provider.dart        # Speech recognition & text-to-speech
└── screens/                       # Presentation screens
    ├── auth/                      # Login & Signup screens
    ├── dashboard/                 # Real-time weather & soil dashboard
    ├── advisor/                   # Multilingual AI agricultural advisor
    ├── mandi/                     # Live Mandi rates search & trends
    └── marketplace/               # Bilateral & circular barter loops
```

---

## 🌐 Multilingual Voice Interaction

- **Supported Languages:** Hindi, Marathi, Telugu, Tamil, Punjabi, Gujarati, and English.
- **Voice Pipeline:**
  1. Speech capture via device microphone using `speech_to_text`.
  2. Audio snippet or transcribed text passed to SkyView FastAPI voice router.
  3. Response synthesized to farmer's native dialect via `flutter_tts`.
