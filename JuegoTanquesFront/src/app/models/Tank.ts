import { GameMap } from './GameMap';
import { Tanque } from '../models/game-data';

export class Tank {
  public x: number;
  public y: number;
  public width: number = 44;   // Ancho visual ajustado para la celda
  public height: number = 44;  // Alto visual ajustado para la celda
  public angle: number = 0;    // Ángulo en radianes hacia donde apunta el chasis

  // Stats dinámicas extraídas directamente de la base de datos (game-data)
  public data: Tanque;
  public currentHp: number;
  public currentSpeed: number;

  private tankImage: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;

  constructor(startX: number, startY: number, tanqueData: Tanque) {
    this.x = startX;
    this.y = startY;
    this.data = tanqueData;

    // Stats reales basadas en el tipo de tanque
    this.currentHp = tanqueData.vida_base;
    // Factor de escala para movimiento fluido a 60 FPS en el Canvas
    this.currentSpeed = tanqueData.velocidad_base * 0.45;

    this.loadTankImage(tanqueData.imagen);
  }

  private loadTankImage(path: string) {
    if (path) {
      this.tankImage = new Image();
      this.tankImage.src = path;
      this.tankImage.onload = () => {
        this.imageLoaded = true;
      };
    }
  }

  // Desplazamiento dinámico respetando la velocidad del tanque seleccionado
  public move(dx: number, dy: number, gameMap: GameMap, canvasWidth: number, canvasHeight: number) {
    const nextX = this.x + dx * this.currentSpeed;
    const nextY = this.y + dy * this.currentSpeed;

    // Actualizamos la rotación suavemente hacia la dirección de la marcha
    if (dx !== 0 || dy !== 0) {
      this.angle = Math.atan2(dy, dx);
    }

    // Validamos que las 4 esquinas del tanque estén libres en la matriz (36x64)
    if (!this.checkCollision(nextX, nextY, canvasWidth, canvasHeight, gameMap)) {
      this.x = nextX;
      this.y = nextY;
    }
  }

  // Detección precisa contra la matriz de colisiones
  private checkCollision(x: number, y: number, canvasWidth: number, canvasHeight: number, gameMap: GameMap): boolean {
    const margin = 8; // Margen para dar tolerancia natural en las esquinas de los edificios
    const left = x - this.width / 2 + margin;
    const right = x + this.width / 2 - margin;
    const top = y - this.height / 2 + margin;
    const bottom = y + this.height / 2 - margin;

    const rows = gameMap.currentMap.filas;
    const cols = gameMap.currentMap.columnas;
    const tileWidth = canvasWidth / cols;
    const tileHeight = canvasHeight / rows;

    const corners = [
      { r: Math.floor(top / tileHeight), c: Math.floor(left / tileWidth) },
      { r: Math.floor(top / tileHeight), c: Math.floor(right / tileWidth) },
      { r: Math.floor(bottom / tileHeight), c: Math.floor(left / tileWidth) },
      { r: Math.floor(bottom / tileHeight), c: Math.floor(right / tileWidth) }
    ];

    for (const corner of corners) {
      if (gameMap.isWall(corner.r, corner.c)) {
        return true; // Colisión detectada
      }
    }

    return false; // Área despejada
  }

  // Renderizado del tanque en el canvas
  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.imageLoaded && this.tankImage) {
      // Dibujar Sprite PNG Oficial
      ctx.drawImage(this.tankImage, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      // Dibujo vectorial táctico de respaldo por si la imagen PNG no existe aún
      ctx.fillStyle = '#10b981'; // Verde Scout
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

      // Detalle del cañón apuntando hacia la derecha (0 rads)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -3, this.width / 2 + 10, 6);
    }

    ctx.restore();
  }
}
