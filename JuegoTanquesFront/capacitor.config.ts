import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tanques.juego',
  appName: 'Juego Tanques',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  android: {
    // 🟢 Esto le indica a Android que permita contenido mixto/tráfico web seguro e inseguro si lo requiere el túnel
    allowMixedContent: true
  },
  plugins: {
    ScreenOrientation: {
      // Configuración por si usas el plugin de orientación de Capacitor
    }
  }
};

export default config;
