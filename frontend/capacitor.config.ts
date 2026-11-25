import type { CapacitorConfig } from '@capacitor/cli'

export default {
  appId: 'io.github.widlakolak.kicimondo',
  appName: 'Kicimondo',
  webDir: 'dist-android',
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
    errorPath: 'compatibility.html',
  },
  android: { minWebViewVersion: 80 },
} satisfies CapacitorConfig
