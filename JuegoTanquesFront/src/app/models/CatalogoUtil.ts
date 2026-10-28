import { Arma, Tanque, ARMAS_JUEGO, TANQUES_JUEGO } from './game-data';
import { IArmaCatalogo, ITanqueCatalogo } from './IJuego';

// En la base de datos los ids son números (1, 2, 3) y en el motor del juego son
// texto ('TANK-01', 'WEAP-01'). Estas funciones convierten de un lado al otro.
export const codigoTanque = (id: number): string => `TANK-${String(id).padStart(2, '0')}`;
export const codigoArma = (id: number): string => `WEAP-${String(id).padStart(2, '0')}`;
export const idDeCodigo = (codigo: string): number => parseInt(codigo.split('-')[1], 10);

// Une los datos reales de la API (vida, precio...) con lo que solo existe en el front
// (imágenes y habilidades), y lo deja con la forma que ya usa el juego.
export function aTanqueJuego(dto: ITanqueCatalogo): Tanque {
  const local = TANQUES_JUEGO.find(t => t.tanque_id === codigoTanque(dto.id));
  return {
    tanque_id: codigoTanque(dto.id),
    nombre: dto.nombre,
    vida_base: dto.vidaBase,
    velocidad_base: dto.velocidadBase,
    blindaje: dto.blindaje,
    precio: dto.precio,
    imagenTienda: local?.imagenTienda ?? 'assets/imgs/tanques/scout.png',
    imagenJuego: local?.imagenJuego ?? 'assets/imgs/tanques/scoutTopDown.png',
    habilidades: local?.habilidades ?? [],
  };
}

export function aArmaJuego(dto: IArmaCatalogo): Arma {
  const local = ARMAS_JUEGO.find(a => a.arma_id === codigoArma(dto.id));
  return {
    arma_id: codigoArma(dto.id),
    nombre: dto.nombre,
    danio_base: dto.danioBase,
    cadencia_fuego: local?.cadencia_fuego ?? etiquetaCadencia(dto.cadenciaFuego),
    velocidad_proyectil: dto.velocidadProyectil,
    precio: dto.precio,
    imagen: local?.imagen ?? 'assets/imgs/armas/escopeta.png',
  };
}

function etiquetaCadencia(cadencia: number): string {
  if (cadencia >= 1) return 'Media';
  if (cadencia >= 0.8) return 'Baja';
  return 'Muy Baja';
}
