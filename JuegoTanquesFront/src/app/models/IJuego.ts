// Formas de los datos que manda la API (los nombres van en camelCase)

export interface IResumenJugador {
  usuarioId: number;
  nombre: string;
  correo: string;
  nivel: number;
  experiencia: number;
  experienciaSiguienteNivel: number;
  monedas: number;
  partidas: number;
  victorias: number;
  derrotas: number;
  tanquesDestruidos: number;
  fotoPerfil?: string; // 👈 Asegúrate de que se llame 'fotoPerfil' sin guion bajo
}

export interface ITanqueCatalogo {
  id: number;
  nombre: string;
  vidaBase: number;
  velocidadBase: number;
  blindaje: number;
  precio: number;
}

export interface IArmaCatalogo {
  id: number;
  nombre: string;
  danioBase: number;
  cadenciaFuego: number;
  velocidadProyectil: number;
  precio: number;
}

export interface ICatalogo {
  tanques: ITanqueCatalogo[];
  armas: IArmaCatalogo[];
}

export interface IInventario {
  tanqueIds: number[];
  armaIds: number[];
}

export interface IPreset {
  presetId: number;
  numeroSlot: number;
  nombre: string;
  tanqueId: number;
  armaId: number;
  esActivo: boolean;
}

export interface IRankingItem {
  usuarioId: number;
  nombre: string;
  experiencia: number;
  nivel: number;
  victorias: number;
  derrotas: number;
  foto_perfil?: string; // 🟢 Añade esta línea
  posicion?: number;
}

export interface ICompraRespuesta {
  monedas: number;
}
export interface IResumenJugador {
  usuarioId: number;
  nombre: string;
  nivel: number;
  monedas: number;
  experiencia: number;
  experienciaSiguienteNivel: number;
  victorias: number;
  derrotas: number;
  foto_perfil?: string; // 🟢 ¡Añade esta línea aquí!
}
export interface IRankingItem {
  usuarioId: number;
  nombre: string;
  experiencia: number;
  nivel: number;
  victorias: number;
  derrotas: number;
  fotoPerfil?: string; // 👈 Con P mayúscula
  posicion?: number;
}
