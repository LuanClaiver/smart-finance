import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.smartfinance.app',
  appName: 'Smart Finance',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
      logLevel: 1,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_smart_finance',
      iconColor: '#22c55e',
    },
  },
}

export default config
