# CAISH Hackathon Frontend

Progressive Web App (PWA) for visualizing sentiment analysis data. The app can be installed on devices and works offline.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (typically `http://localhost:5173`)

## Installing as an App

### Desktop (Chrome/Edge)
- Look for the install icon in the address bar
- Or use the install prompt that appears
- The app will open in its own window without browser UI

### Mobile (iOS)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will appear as a native app icon

### Mobile (Android)
- An install prompt will appear automatically
- Or use Chrome menu → "Install app" or "Add to Home Screen"

## Project Structure

- `src/App.jsx` - Main application component
- `src/components/SentimentGraphA.jsx` - Graph A component displaying sentiment curves over time
- `src/components/InstallPrompt.jsx` - PWA install prompt component
- `public/scripts/dummy.JSON` - Sample sentiment data

## Features

### Progressive Web App (PWA)
- ✅ Installable on desktop and mobile devices
- ✅ Works offline with service worker caching
- ✅ App-like experience (standalone mode)
- ✅ Responsive design optimized for all screen sizes
- ✅ Safe area support for notched devices

### Graph A
- Multi-line chart showing sentiment confidence levels over time
- Displays 5 sentiment types: Bored, Confused, Engaged, Frustrated, Excited
- Interactive tooltips showing values and lecture content
- Color-coded lines for easy identification
- Fully responsive with mobile optimizations

## Build for Production

### Web Build (PWA)
```bash
npm run build
```

The built files will be in the `dist` folder, including:
- Service worker for offline functionality
- Web app manifest
- Optimized assets

### Native App Builds

This app can be built as downloadable native apps for iOS, Android, and desktop!

**Quick Start:**
1. Build the web app: `npm run build`
2. Add platform: `npx cap add android` or `npx cap add ios`
3. Sync: `npx cap sync`
4. Open: `npx cap open android` or `npx cap open ios`

**For detailed build instructions, see [BUILD.md](./BUILD.md)**

**Available Build Commands:**
- `npm run android:build` - Build and open Android Studio
- `npm run ios:build` - Build and open Xcode
- `npm run android:dev` - Build and run on Android device
- `npm run ios:dev` - Build and run on iOS device/simulator

## PWA Icons

The app is configured to use PWA icons. To add custom icons:
1. Create `pwa-192x192.png` and `pwa-512x512.png` in the `public` folder
2. Create `apple-touch-icon.png` (180x180) for iOS
3. Icons will be automatically included in the build

A helper HTML file is available at `public/generate-icons.html` to create placeholder icons.

