import type { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.BURGERMY_APP_URL;

const config: CapacitorConfig = {
  appId: 'tr.burgermy.app',
  appName: 'BURGERMY',
  webDir: 'www',
  ...(appUrl ? {
    server: {
      url: appUrl,
      cleartext: false,
      allowNavigation: ['*.supabase.co', 'www.paytr.com']
    }
  } : {}),
  ios: { contentInset: 'automatic' },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: '#0b0b0b' },
    StatusBar: { style: 'DARK', backgroundColor: '#0b0b0b' }
  }
};
export default config;
