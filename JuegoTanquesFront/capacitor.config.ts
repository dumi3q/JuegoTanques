import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tanques.juego',
  appName: 'Juego Tanques',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    ScreenOrientation: {
      // Configuración por si usas el plugin de orientación de Capacitor
    }
  }
};

export default config;
