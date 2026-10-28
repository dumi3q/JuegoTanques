import { Injectable, signal } from '@angular/core';

export interface IAjustes {
  volumenMusica: number;
  volumenEfectos: number;
  sensibilidadApuntado: number;
  apuntadoAsistido: boolean;
  vibracionImpacto: boolean;
  efectosHumo: boolean;
  mostrarFps: boolean;
  calidadGrafica: string;
}

export const AJUSTES_POR_DEFECTO: IAjustes = {
  volumenMusica: 75,
  volumenEfectos: 90,
  sensibilidadApuntado: 50,
  apuntadoAsistido: true,
  vibracionImpacto: true,
  efectosHumo: true,
  mostrarFps: false,
  calidadGrafica: 'alta',
};

// Guarda los ajustes en el dispositivo. El juego los lee de "ajustes()" cuando
// los necesite (sensibilidad, vibración, FPS...).
// Por ahora se guardan en el almacenamiento del navegador; después se pueden pasar
// a la tabla AjustesJuego de SQLite sin tocar las pantallas.
@Injectable({ providedIn: 'root' })
export class AjustesService {
  private readonly clave = 'tanques-ajustes';

  readonly ajustes = signal<IAjustes>(this.leer());

  guardar(ajustes: IAjustes): void {
    this.ajustes.set({ ...ajustes });
    try {
      localStorage.setItem(this.clave, JSON.stringify(ajustes));
    } catch {
      // Si el almacenamiento está bloqueado, los ajustes valen solo mientras la app esté abierta
    }
  }

  restablecer(): IAjustes {
    const porDefecto = { ...AJUSTES_POR_DEFECTO };
    this.guardar(porDefecto);
    return porDefecto;
  }

  private leer(): IAjustes {
    try {
      const texto = localStorage.getItem(this.clave);
      return texto ? { ...AJUSTES_POR_DEFECTO, ...JSON.parse(texto) } : { ...AJUSTES_POR_DEFECTO };
    } catch {
      return { ...AJUSTES_POR_DEFECTO };
    }
  }
}
