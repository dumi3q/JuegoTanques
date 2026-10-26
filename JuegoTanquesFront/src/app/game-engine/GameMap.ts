import { MAPAS_JUEGO, MapaJuego } from '../models/game-data';

export class GameMap {
  public currentMap: MapaJuego;

  constructor(mapId: string) {
    const found = MAPAS_JUEGO.find(m => m.id === mapId);
    if (found) {
      this.currentMap = found;
    } else {
      // Mapa por defecto si no se encuentra
      this.currentMap = MAPAS_JUEGO[0];
    }
  }

  // Verifica si una celda es un muro sólido
  public isWall(row: number, col: number): boolean {
    const filas = this.currentMap.matrizColisiones;
    if (row < 0 || row >= filas.length || col < 0 || col >= filas[0].length) {
      return true; // Los bordes del mapa son impenetrables
    }
    return filas[row][col] === 1;
  }

  // Renderizado por capas (Capa 1: Suelo, Capa 2: Edificios/Muros con relieve y profundidad)
  public draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    const filas = this.currentMap.matrizColisiones;
    const numRows = filas.length;
    const numCols = filas[0].length;

    const tileWidth = canvasWidth / numCols;
    const tileHeight = canvasHeight / numRows;

    // --- CAPA 1: DIBUJAR EL SUELO (Asfalto y texturas base) ---
    ctx.fillStyle = '#1e1e24'; // Tono de asfalto oscuro industrial
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Dibujar una cuadrícula sutil de calles o detalles de asfalto
    ctx.strokeStyle = '#2a2a35';
    ctx.lineWidth = 1;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const x = c * tileWidth;
        const y = r * tileHeight;

        if (filas[r][c] === 0) {
          // Es calle o zona transitable: dibujamos detalles de asfalto desgastado
          ctx.strokeRect(x, y, tileWidth, tileHeight);
        }
      }
    }

    // --- CAPA 2: DIBUJAR EDIFICIOS / OBSTÁCULOS (Con relieve, sombra y 3D falso) ---
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (filas[r][c] === 1) {
          const x = c * tileWidth;
          const y = r * tileHeight;

          // 1. Sombra base del edificio (Efecto de profundidad / volumen hacia abajo y derecha)
          ctx.fillStyle = '#0a0a0e';
          ctx.fillRect(x + 4, y + 4, tileWidth, tileHeight);

          // 2. Cuerpo principal del muro / edificio
          ctx.fillStyle = '#4a4e58'; // Color concreto militar / ladrillo destruido
          ctx.fillRect(x, y, tileWidth, tileHeight);

          // 3. Borde superior e izquierdo iluminado (Da efecto 3D cenital)
          ctx.strokeStyle = '#717786';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, tileWidth, tileHeight);

          // 4. Detalle interno táctico en el bloque
          ctx.fillStyle = '#32363f';
          ctx.fillRect(x + tileWidth * 0.25, y + tileHeight * 0.25, tileWidth * 0.5, tileHeight * 0.5);
        }
      }
    }
  }
}
