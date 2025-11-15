# Building Downloadable Apps

This guide explains how to build native apps that can be downloaded and installed on devices.

## Prerequisites

### For Android:
- [Android Studio](https://developer.android.com/studio) installed
- Android SDK configured
- Java Development Kit (JDK) 11 or higher

### For iOS:
- macOS with Xcode installed
- Xcode Command Line Tools
- Apple Developer Account (for device testing and App Store)

### For Desktop (Electron - Optional):
- Node.js installed
- All platforms supported (Windows, macOS, Linux)

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Build the web app:**
```bash
npm run build
```

3. **Initialize Capacitor (first time only):**
```bash
npx cap init
```

## Building Android App (.apk)

1. **Add Android platform:**
```bash
npx cap add android
```

2. **Sync web assets:**
```bash
npm run build
npx cap sync
```

3. **Open in Android Studio:**
```bash
npx cap open android
```

4. **In Android Studio:**
   - Wait for Gradle sync to complete
   - Go to `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Or `Build` → `Generate Signed Bundle / APK` for release builds
   - APK will be in `android/app/build/outputs/apk/`

5. **Or build from command line:**
```bash
cd android
./gradlew assembleDebug  # Debug APK
./gradlew assembleRelease # Release APK (requires signing)
```

## Building iOS App (.ipa)

1. **Add iOS platform:**
```bash
npx cap add ios
```

2. **Sync web assets:**
```bash
npm run build
npx cap sync
```

3. **Open in Xcode:**
```bash
npx cap open ios
```

4. **In Xcode:**
   - Select your development team in Signing & Capabilities
   - Choose a device or simulator
   - Click `Product` → `Archive` for App Store build
   - Or `Product` → `Run` for device testing
   - Export the .ipa from Organizer

## Quick Build Commands

```bash
# Android - Build and open Android Studio
npm run android:build

# iOS - Build and open Xcode
npm run ios:build

# Android - Build and run on connected device
npm run android:dev

# iOS - Build and run on connected device/simulator
npm run ios:dev
```

## Building Desktop Apps (Electron - Optional)

If you want desktop apps (.exe, .dmg, .AppImage), you can add Electron:

1. **Install Electron:**
```bash
npm install --save-dev electron electron-builder
```

2. **Create electron main file** (`electron/main.js`)

3. **Update package.json** with electron scripts

4. **Build:**
```bash
npm run electron:build
```

## Distribution

### Android
- **Debug APK**: Can be installed directly on devices (enable "Install from unknown sources")
- **Release APK**: For Google Play Store or direct distribution
- **AAB (Android App Bundle)**: Required for Google Play Store

### iOS
- **Development Build**: For testing on registered devices
- **Ad Hoc Distribution**: For beta testing (up to 100 devices)
- **App Store**: For public distribution via App Store

### Desktop
- **Windows**: `.exe` installer
- **macOS**: `.dmg` or `.pkg` installer
- **Linux**: `.AppImage`, `.deb`, or `.rpm`

## Troubleshooting

### Android Build Issues
- Ensure Android SDK is properly configured
- Check `ANDROID_HOME` environment variable
- Update Gradle if needed: `cd android && ./gradlew wrapper --gradle-version 8.0`

### iOS Build Issues
- Ensure Xcode Command Line Tools: `xcode-select --install`
- Check CocoaPods: `cd ios && pod install`
- Verify signing certificates in Xcode

### Sync Issues
- Always run `npm run build` before `npx cap sync`
- Clear Capacitor cache: `rm -rf .capacitor`
- Re-sync: `npx cap sync`

## Notes

- The web app must be built before syncing to native platforms
- Always test on real devices, not just simulators
- For production releases, configure proper app signing
- Update `appId` in `capacitor.config.js` to match your organization

