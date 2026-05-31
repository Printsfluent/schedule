import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import os from 'os'

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

export default defineConfig({
  base: isCapacitorBuild ? './' : '/',
  plugins: [
    ...(useHttps ? [basicSsl()] : []),
    react(),
    tailwindcss(),
    ...(isCapacitorBuild
      ? []
      : [
          VitePWA({
      devOptions: { enabled: useHttps, type: 'module' },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg'],
      manifest: {
        name: 'Rhythm',
        short_name: 'Rhythm',
        description: 'Schedule & productivity for remote life balance',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        importScripts: ['rhythm-plan-alarms.js'],
        runtimeCaching: [
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
