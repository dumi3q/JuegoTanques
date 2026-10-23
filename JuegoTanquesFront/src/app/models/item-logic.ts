import { PowerUpNerf, POWERUPS_NERFS_JUEGO } from '../models/game-data';

export interface ItemEnMapa {
  idUnico: string;
  itemData: PowerUpNerf;
  fila: number;
  columna: number;
}

export class GestorItemsMapa {
  // Ítems que están actualmente activos en el mapa de juego
  itemsActivos: ItemEnMapa[] = [];

  // Matriz del mapa actual (16 filas x 32 columnas)
  private matrizMapa: number[][] = [];

  constructor(matriz: number[][]) {
    this.matrizMapa = matriz;
  }

  /**
   * Genera un ítem aleatorio (Power-Up o Nerf) en una posición libre (0) de la matriz
   */
  spawnearItemAleatorio(): ItemEnMapa | null {
    const celdasLibres: { fila: number; col: number }[] = [];

    // 1. Buscar todas las celdas disponibles (donde hay un 0)
    for (let f = 0; f < this.matrizMapa.length; f++) {
      for (let c = 0; c < this.matrizMapa[f].length; c++) {
        if (this.matrizMapa[f][c] === 0) {
          celdasLibres.push({ fila: f, col: c });
        }
      }
    }

    if (celdasLibres.length === 0) return null;

    // 2. Elegir una celda al azar
    const celdaAleatoria = celdasLibres[Math.floor(Math.random() * celdasLibres.length)];

    // 3. Elegir un Power-Up o Nerf al azar de nuestro catálogo
    const itemCatalogo = POWERUPS_NERFS_JUEGO[Math.floor(Math.random() * POWERUPS_NERFS_JUEGO.length)];

    const nuevoItemEnMapa: ItemEnMapa = {
      idUnico: 'ITEM-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      itemData: itemCatalogo,
      fila: celdaAleatoria.fila,
      columna: celdaAleatoria.col
    };

    this.itemsActivos.push(nuevoItemEnMapa);
    return nuevoItemEnMapa;
  }

  /**
   * Comprueba si un tanque colisiona con las coordenadas de un ítem en el mapa
   */
  verificarRecogidaItem(tanqueFila: number, tanqueColumna: number): PowerUpNerf | null {
    const index = this.itemsActivos.findIndex(
      item => item.fila === tanqueFila && item.columna === tanqueColumna
    );

    if (index !== -1) {
      // El tanque pasó por encima del ítem: lo eliminamos del mapa y devolvemos su efecto
      const itemRecogido = this.itemsActivos.splice(index, 1)[0];
      return itemRecogido.itemData;
    }

    return null; // No tocó ningún ítem
  }

  /**
   * Aplica el efecto del ítem recogido al tanque afectado
   */
  aplicarEfecto(tanque: any, item: PowerUpNerf) {
    switch (item.id) {
      case 'POW-01': // Botiquín de Taller
        tanque.vida = Math.min(tanque.vidaMax, tanque.vida + 30);
        console.log('¡Botiquín aplicado! +30 HP');
        break;
      case 'POW-02': // Sobrecarga de Fuego
        tanque.danioMultiplicador = 1.5;
        console.log('¡Sobrecarga de Fuego activa!');
        break;
      case 'POW-03': // Escudo Gauss
        tanque.tieneEscudo = true;
        console.log('¡Escudo Gauss activado!');
        break;
      case 'NERF-01': // Mancha de Aceite
        tanque.estaDerrapando = true;
        console.log('¡Tanque afectado por Mancha de Aceite!');
        break;
      case 'NERF-02': // Oruga Rota
        tanque.velocidadActual = tanque.velocidad_base * 0.5;
        console.log('¡Oruga Rota! Velocidad reducida');
        break;
      case 'NERF-03': // Falla de Mecanismo
        tanque.puedeDisparar = false;
        console.log('¡Arma silenciada por falla temporal!');
        break;
      default:
        break;
    }
  }
}
