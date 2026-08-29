import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.dinescout.mobile',
  appName: 'DineScout',
  webDir: 'dist/mobile/browser',
  server: {
    // During native development against a local API, uncomment and point
    // this at your machine's LAN IP (localhost won't resolve from a
    // simulator/device) — see README.md "Mobile builds".
    // url: 'http://192.168.1.10:8100',
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
