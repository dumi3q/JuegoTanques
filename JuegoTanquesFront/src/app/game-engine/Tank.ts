import { GameMap } from './GameMap';
import { Tanque } from '../models/game-data';

export class Tank {
  public turretAngle: number = 0;
  public x: number;
  public y: number;
  // El tamaño se alinea con la celda de 40×40 px del mapa (32×18 en 1280×720).
  public width: number = 44;
  public height: number = 44;
  public angle: number = 0;

  public currentHp: number;
  public currentSpeed: number;
  public isPlayer: boolean;

  private tankImage: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;

  constructor(startX: number, startY: number, public tankData: Tanque, isPlayer: boolean = true) {
    this.x = startX;
    this.y = startY;
    this.tankData = tankData;
    this.isPlayer = isPlayer;

    this.currentHp = tankData.vida_base;
    this.currentSpeed = (tankData.velocidad_base || 2) * 0.45;

    this.loadTankImage(tankData.imagenJuego);
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

  public move(dx: number, dy: number, gameMap: GameMap, canvasWidth: number, canvasHeight: number) {
    if (dx !== 0 || dy !== 0) this.angle = Math.atan2(dy, dx);

    const moveX = dx * this.currentSpeed;
    const moveY = dy * this.currentSpeed;
    const rows = gameMap.currentMap.matrizColisiones.length;
    const cols = gameMap.currentMap.matrizColisiones[0].length;
    const tileW = canvasWidth / cols;
    const tileH = canvasHeight / rows;
    // Sub-pasos evitan que un dash o una actualización rápida salte por encima de una pared.
    const maxStep = Math.max(2, Math.min(tileW, tileH) / 5);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(moveX), Math.abs(moveY)) / maxStep));
    const sx = moveX / steps;
    const sy = moveY / steps;

    for (let i = 0; i < steps; i++) {
      const nextX = this.x + sx;
      if (!this.checkCollision(nextX, this.y, canvasWidth, canvasHeight, gameMap)) this.x = nextX;

      const nextY = this.y + sy;
      if (!this.checkCollision(this.x, nextY, canvasWidth, canvasHeight, gameMap)) this.y = nextY;
    }
  }

  private checkCollision(x: number, y: number, canvasWidth: number, canvasHeight: number, gameMap: GameMap): boolean {
    const rows = gameMap.currentMap.matrizColisiones.length;
    const cols = gameMap.currentMap.matrizColisiones[0].length;
    const tileW = canvasWidth / cols;
    const tileH = canvasHeight / rows;
    // Caja cercana al sprite, pero un poco menor que una celda para poder usar los pasillos.
    const halfW = Math.min(this.width * 0.43, tileW * 0.48);
    const halfH = Math.min(this.height * 0.43, tileH * 0.48);
    const left = x - halfW;
    const right = x + halfW;
    const top = y - halfH;
    const bottom = y + halfH;

    if (left < 0 || top < 0 || right >= canvasWidth || bottom >= canvasHeight) return true;

    const minCol = Math.floor(left / tileW);
    const maxCol = Math.floor((right - 0.001) / tileW);
    const minRow = Math.floor(top / tileH);
    const maxRow = Math.floor((bottom - 0.001) / tileH);
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row < 0 || row >= rows || col < 0 || col >= cols || gameMap.isWall(row, col)) return true;
      }
    }
    return false;
  }

  public draw(ctx: CanvasRenderingContext2D, activeEffect: string | null = null, teamAuraColor?: string) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // En online, teamAuraColor es autoritativo: azul para aliados y rojo para enemigos.
    // En offline, donde no se pasa, se conserva el comportamiento original de los efectos.
    let auraColor = teamAuraColor ?? (this.isPlayer ? '#00d2ff' : '#ff2222');
    let auraBlur = this.isPlayer ? 15 : 18;
    let effectColor: string | null = null;

    if (activeEffect === 'ESCUDO') {
      effectColor = '#00ffff'; auraBlur = 25;
    } else if (activeEffect === 'ORUGA') {
      effectColor = '#00ff00'; auraBlur = 20;
    } else if (activeEffect === 'SOBRECARGA') {
      effectColor = '#ffaa00'; auraBlur = 22;
    } else if (activeEffect === 'ACEITE' || activeEffect === 'FALLA') {
      effectColor = '#ff0055'; auraBlur = 20;
    } else if (activeEffect === 'ROJO') {
      effectColor = '#ff1111'; auraBlur = 18;
    }
    if (!teamAuraColor && effectColor) auraColor = effectColor;

    ctx.shadowBlur = auraBlur;
    ctx.shadowColor = auraColor;

    if (activeEffect && activeEffect !== 'ROJO') {
      ctx.strokeStyle = effectColor ?? auraColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2 + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.imageLoaded && this.tankImage) {
      ctx.drawImage(this.tankImage, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = teamAuraColor ?? (this.isPlayer ? '#10b981' : '#ef4444');
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -4, this.width / 2 + 10, 8);
    }

    ctx.restore();
  }
}
