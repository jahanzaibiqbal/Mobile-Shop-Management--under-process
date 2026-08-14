import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.teleportal.mobileshop',
  appName: 'Teleportal Station',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
