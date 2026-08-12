import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tr.burgermy.app',
  appName: 'BURGERMY',
  webDir: 'www',
  server: {
    url: 'https://burgermy.tr',
    cleartext: false,
    allowNavigation: ['burgermy.tr', '*.supabase.co', 'www.paytr.com']
  },
  ios: { contentInset: 'automatic' },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: '#0b0b0b' },
    StatusBar: { style: 'DARK', backgroundColor: '#0b0b0b' }
  }
};
export default config;
