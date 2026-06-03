import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import os from 'os'
import {
  FORCE_LOGIN_LOCAL_KEY,
  SERVICE_WORKER_FILE,
  SW_PURGE_LOCAL_KEY,
  SW_RELOAD_SESSION_KEY,
  WORKBOX_CACHE_ID,
} from './src/lib/auth/gateVersion'

const useHttps = process.env.VITE_HTTPS !== 'false'
const isCapacitorBuild = process.env.CAPACITOR === 'true'
const port = 5173

function lanIp(): string | null {
  for (const nets of Object.values(os.networkInterfaces())) {
    if (!nets) continue
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
        return net.address
      }
    }
  }
  return null
}

const webBase = process.env.VITE_BASE_PATH ?? '/'
const loginPath = `${webBase.replace(/\/$/, '')}/login` || '/login'
const appBuildId =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? `local-${Date.now()}`

export default defineConfig({
  base: isCapacitorBuild ? './' : webBase,
  define: {
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
  },
  plugins: [
    ...(useHttps ? [basicSsl()] : []),
    {
      name: 'inject-auth-gate',
      transformIndexHtml(html) {
        return html
          .replaceAll('__SW_PURGE_KEY__', SW_PURGE_LOCAL_KEY)
          .replaceAll('__FORCE_LOGIN_KEY__', FORCE_LOGIN_LOCAL_KEY)
          .replaceAll('__SW_RELOAD_KEY__', SW_RELOAD_SESSION_KEY)
          .replaceAll('__LOGIN_PATH__', loginPath)
      },
    },
    react(),
    tailwindcss(),
    ...(isCapacitorBuild
      ? []
      : [
          VitePWA({
      devOptions: { enabled: useHttps, type: 'module' },
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      filename: SERVICE_WORKER_FILE,
      includeAssets: ['favicon.svg', 'logo.svg'],
      manifest: {
        name: 'Rhythm',
        short_name: 'Rhythm',
        description: 'Schedule & productivity for remote life balance',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        start_url: `${webBase}login`,
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        cacheId: WORKBOX_CACHE_ID,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: undefined,
        globPatterns: ['**/*.{ico,svg,woff2,webmanifest}'],
        importScripts: ['rhythm-plan-alarms.js'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\.(?:js|css|mjs)$/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
        ]),
    {
      name: 'phone-connect-hints',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          const ip = lanIp()
          const proto = useHttps ? 'https' : 'http'
          console.log('\n  📱 iPhone / Android on same Wi‑Fi:')
          if (ip) {
            console.log(`     ${proto}://${ip}:${port}/`)
            console.log(`     Test first: ${proto}://${ip}:${port}/connect-test.html`)
          } else {
            console.log(`     Use the Network URL shown above (192.168.x.x)`)
          }
          if (useHttps) {
            console.log('     First visit on phone: accept the certificate warning (Advanced → Proceed)')
            console.log('     Required for notifications and PWA install on all browsers.')
          } else {
            console.log('     HTTP mode — notifications blocked on phones. Use npm run dev (HTTPS default).')
          }
          console.log('     If that fails: Mac → System Settings → Network → Firewall → allow Node')
          console.log('     Or run in a second terminal: npm run tunnel\n')
        })
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port,
    strictPort: false,
    hmr: {
      protocol: useHttps ? 'wss' : 'ws',
    },
  },
  preview: {
    host: '0.0.0.0',
    port,
  },
  build: {
    target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
  },
})
