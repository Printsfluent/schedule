import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.rhythm.schedule',
  appName: 'Rhythm',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0a0e14',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    LocalNotifications: {
      iconColor: '#3dd68c',
      sound: 'default',
    },
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
  },
}

export default config
