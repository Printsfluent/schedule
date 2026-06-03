import { AUTH_BUNDLE_REV } from './lib/auth/gateVersion'

declare global {
  interface Window {
    __RHYTHM_AUTH_REV__?: number
  }
}

window.__RHYTHM_AUTH_REV__ = AUTH_BUNDLE_REV

import { bootstrapApp } from './bootstrap'
import { StrictMode } from 'react'
import { Capacitor } from '@capacitor/core'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App'

if (import.meta.env.DEV && !Capacitor.isNativePlatform()) {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister())
    })
  }
  if ('caches' in window) {
    void caches.keys().then((keys) => {
      keys
        .filter((k) => k.includes('workbox') || k.includes('rhythm') || k.includes('vite'))
        .forEach((k) => void caches.delete(k))
    })
  }
}

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}

void bootstrapApp().then(mount)
