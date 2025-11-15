import React from 'react'
import ReactDOM from 'react-dom/client'
import { NextUIProvider } from '@nextui-org/react'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import './index.css'

// Initialize Capacitor plugins if running in native app
if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    SplashScreen.hide()
  }).catch(() => {})
  
  import('@capacitor/status-bar').then(({ StatusBar }) => {
    StatusBar.setStyle({ style: 'dark' })
    StatusBar.setBackgroundColor({ color: '#A7CDB8' })
  }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NextUIProvider>
      <App />
    </NextUIProvider>
  </React.StrictMode>,
)

