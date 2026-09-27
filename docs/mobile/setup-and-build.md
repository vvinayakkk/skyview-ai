# 🛠️ Mobile Setup, Emulation & Local Build Guide

This guide details how to clone, configure dependencies, run on physical devices or emulators, and compile the Flutter release APK.

---

## 📋 Prerequisites

1. **Flutter SDK:** Version `3.24.3` on channel `stable`.
2. **Dart SDK:** Version `3.5.3`.
3. **Java Development Kit (JDK):** OpenJDK 17 (`temurin-17`).
4. **Android Studio:** Android SDK Platform 34 and Android Build Tools 34.0.0.

---

## 🚀 Step-by-Step Local Setup

### 1. Verify Environment
```bash
flutter doctor -v
```

### 2. Install Packages
```bash
cd skyview_flutter_app/skyview_flutter
flutter pub get
```

### 3. Run Development Build
Connect your Android phone via USB with USB Debugging enabled, or boot an Android Emulator (AVD):
```bash
flutter run
```

---

## 📦 Compiling Production Release APK

To create an optimized, signed release binary:

```bash
flutter build apk --release
```

The resulting standalone binary will be located at:
```
build/app/outputs/flutter-apk/app-release.apk
```
This APK includes native 64-bit and 32-bit ARM binaries (`armeabi-v7a`, `arm64-v8a`, and `x86_64`) compatible with Android 8.0+ devices.
