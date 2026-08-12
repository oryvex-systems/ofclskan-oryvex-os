import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tr.tikladoy.app',
  appName: 'TIKLADOY',
  webDir: '../../apps/tikladoy/dist',
  ios: { contentInset: 'automatic' },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: '#0b0d0d' },
    StatusBar: { style: 'DARK', backgroundColor: '#0b0d0d' }
  }
};
export default config;
