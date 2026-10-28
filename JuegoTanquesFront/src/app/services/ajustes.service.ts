import { Injectable, signal } from '@angular/core';

export interface IAjustes {
  volumenEfectos: number;
  sensibilidadApuntado: number;
  apuntadoAsistido: boolean;
  vibracionImpacto: boolean;
  mostrarFps: boolean;
}

export const AJUSTES_POR_DEFECTO: IAjustes = {
  volumenEfectos: 90,
  sensibilidadApuntado: 50,
  apuntadoAsistido: true,
  vibracionImpacto: true,
  mostrarFps: false,
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
    const ajustesValidos = this.normalizar(ajustes);
    this.ajustes.set(ajustesValidos);
    try {
      localStorage.setItem(this.clave, JSON.stringify(ajustesValidos));
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
      return texto ? this.normalizar(JSON.parse(texto)) : { ...AJUSTES_POR_DEFECTO };
    } catch {
      return { ...AJUSTES_POR_DEFECTO };
    }
  }

  private normalizar(valor: Partial<IAjustes> | null | undefined): IAjustes {
    const numero = (dato: unknown, defecto: number, minimo: number, maximo: number) => {
      const n = Number(dato);
      return Number.isFinite(n) ? Math.min(maximo, Math.max(minimo, n)) : defecto;
    };
    return {
      volumenEfectos: numero(valor?.volumenEfectos, AJUSTES_POR_DEFECTO.volumenEfectos, 0, 100),
      sensibilidadApuntado: numero(valor?.sensibilidadApuntado, AJUSTES_POR_DEFECTO.sensibilidadApuntado, 10, 100),
      apuntadoAsistido: typeof valor?.apuntadoAsistido === 'boolean' ? valor.apuntadoAsistido : AJUSTES_POR_DEFECTO.apuntadoAsistido,
      vibracionImpacto: typeof valor?.vibracionImpacto === 'boolean' ? valor.vibracionImpacto : AJUSTES_POR_DEFECTO.vibracionImpacto,
      mostrarFps: typeof valor?.mostrarFps === 'boolean' ? valor.mostrarFps : AJUSTES_POR_DEFECTO.mostrarFps,
    };
  }
}
