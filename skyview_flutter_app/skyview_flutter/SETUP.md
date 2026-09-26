# SkyView Flutter App – Setup Guide

## Pre-requisites
- Flutter SDK >= 3.24  (stable channel)
- Android Studio / VS Code with Flutter extension
- Android emulator or physical device (API 23+)
- SkyView FastAPI backend running on `localhost:8000`

---

## STEP 1 – Install / verify Flutter

```bash
# Install via FVM (recommended) – keeps SDK versioned
dart pub global activate fvm
fvm install stable
fvm use stable

# OR use system Flutter directly
flutter --version          # must be >= 3.24.x
flutter doctor -v          # fix any red Xs before proceeding
```

---

## STEP 2 – Create the Flutter project scaffold

```bash
# Run from the same directory that contains your skyview/ backend folder
flutter create \
  --org com.skyview \
  --project-name skyview_app \
  --platforms android,ios \
  --template app \
  --no-pub \
  skyview_app

cd skyview_app
```

> **Then replace the generated files with the ones provided here.**  
> Copy every file from the output bundle into the matching paths inside `skyview_app/`.

---

## STEP 3 – Drop the provided files in place

```
skyview_app/
├── pubspec.yaml                              ← replace generated one
├── lib/
│   ├── main.dart
│   ├── router.dart
│   ├── utils/
│   │   └── constants.dart
│   ├── services/
│   │   ├── auth_service.dart
│   │   ├── chat_service.dart
│   │   └── voice_service.dart
│   └── screens/
│       ├── login_screen.dart
│       ├── chat_screen.dart
│       └── voice_screen.dart
├── assets/
│   └── translations/
│       ├── en.json
│       └── hi.json
├── android/app/src/main/AndroidManifest.xml  ← replace
└── ios/Runner/Info.plist                     ← replace
```

---

## STEP 4 – Set your backend URL

Edit `lib/utils/constants.dart`:

```dart
// Android emulator (talks to your laptop's localhost)
const String kBaseUrl = 'http://10.0.2.2:8000';

// Physical Android device on same WiFi as your laptop
// const String kBaseUrl = 'http://192.168.1.XXX:8000';

// iOS Simulator
// const String kBaseUrl = 'http://127.0.0.1:8000';
```

---

## STEP 5 – Get dependencies

```bash
flutter pub get
```

---

## STEP 6 – Create placeholder assets (fonts optional at first run)

```bash
# Create directories
mkdir -p assets/translations assets/lottie assets/fonts

# The translations are already in assets/translations/en.json and hi.json

# For fonts (optional – app falls back to system font if missing)
# Download Poppins from https://fonts.google.com/specimen/Poppins
# Place Poppins-Regular.ttf, Poppins-Medium.ttf, Poppins-SemiBold.ttf, Poppins-Bold.ttf
# into assets/fonts/
```

---

## STEP 7 – Android setup (one-time)

```bash
# Make sure you have a running emulator or connected device
flutter emulators --launch <emulator_id>
# or
adb devices   # check physical device

# Set min SDK in android/app/build.gradle (already handled by pubspec)
# Ensure compileSdkVersion >= 34 in android/app/build.gradle:
#   android {
#     compileSdk = 34
#     defaultConfig {
#       minSdk = 23
#       targetSdk = 34
#     }
#   }
```

---

## STEP 8 – Run the app

```bash
# Debug mode (hot reload enabled)
flutter run

# Run on a specific device
flutter run -d emulator-5554

# Release build (APK)
flutter build apk --release
# APK appears at build/app/outputs/flutter-apk/app-release.apk

# Install directly to device
flutter install
```

---

## STEP 9 – Start your backend (parallel terminal)

```bash
cd /path/to/skyview_project
uvicorn skyview.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## App flow

```
Launch → Login screen
  ↓ Enter +91XXXXXXXXXX → POST /api/auth/send-otp
  ↓ OTP auto-fills from backend dev response
  ↓ Confirm → POST /api/auth/verify-otp → token stored securely
  ↓
Chat screen  ←→  POST /api/chat  (multi-agent supervisor)
  ↓               POST /api/chat/overview  (AI Overview panel)
  ↓               Internal "Thinking" panel shows agent steps
  ↓
Voice button → Voice screen
  ↓  Tap orb → record WAV
  ↓  Stop    → POST /api/speech/transcribe (Sarvam STT)
  ↓           → POST /api/voice/agent      (agentic reasoning + step log)
  ↓           → POST /api/speech/synthesize (Sarvam TTS) → playback
```

---

## Backend routes consumed

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/send-otp` | POST | Send OTP (returns `otp` in dev) |
| `/api/auth/verify-otp` | POST | Verify OTP → `mock_jwt_{phone}` |
| `/api/chat` | POST | Multi-agent chat (supervisor.py) |
| `/api/chat/overview` | POST | AI Overview for dashboard page |
| `/api/speech/transcribe` | POST multipart | Sarvam STT |
| `/api/speech/synthesize` | POST | Sarvam TTS → base64 audio |
| `/api/voice/agent` | POST | Agentic voice orchestration |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `cleartext HTTP not permitted` on Android | `android:usesCleartextTraffic="true"` already set in AndroidManifest |
| `Connection refused` on emulator | Use `10.0.2.2` not `localhost` |
| `MicrophoneException` | Grant mic permission when prompted or in device settings |
| `pinput` OTP field not showing | Run `flutter pub get` again |
| Font not rendering | Add `.ttf` files to `assets/fonts/` or remove font declarations from pubspec |
