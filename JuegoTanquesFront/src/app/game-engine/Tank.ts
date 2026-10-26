import { GameMap } from './GameMap';
import { Tanque } from '../models/game-data';

export class Tank {
  public turretAngle: number = 0;
  public x: number;
  public y: number;
  public width: number = 75;
  public height: number = 75;
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
    if (dx !== 0 || dy !== 0) {
      this.angle = Math.atan2(dy, dx);
    }

    // Deslizamiento independiente en X e Y para rebotar/resbalar contra las paredes sin trabarse
    const nextX = this.x + dx * this.currentSpeed;
    if (!this.checkCollision(nextX, this.y, canvasWidth, canvasHeight, gameMap)) {
      this.x = nextX;
    }

    const nextY = this.y + dy * this.currentSpeed;
    if (!this.checkCollision(this.x, nextY, canvasWidth, canvasHeight, gameMap)) {
      this.y = nextY;
    }
  }

  private checkCollision(x: number, y: number, canvasWidth: number, canvasHeight: number, gameMap: GameMap): boolean {
    const margin = 14;
    const left = x - this.width / 2 + margin;
    const right = x + this.width / 2 - margin;
    const top = y - this.height / 2 + margin;
    const bottom = y + this.height / 2 - margin;

    const rows = gameMap.currentMap.matrizColisiones.length;
    const cols = gameMap.currentMap.matrizColisiones[0].length;
    const tileWidth = canvasWidth / cols;
    const tileHeight = canvasHeight / rows;

    const corners = [
      { r: Math.floor(top / tileHeight), c: Math.floor(left / tileWidth) },
      { r: Math.floor(top / tileHeight), c: Math.floor(right / tileWidth) },
      { r: Math.floor(bottom / tileHeight), c: Math.floor(left / tileWidth) },
      { r: Math.floor(bottom / tileHeight), c: Math.floor(right / tileWidth) }
    ];

    for (const corner of corners) {
      if (corner.r < 0 || corner.r >= rows || corner.c < 0 || corner.c >= cols) return true;
      if (gameMap.isWall(corner.r, corner.c)) {
        return true;
      }
    }

    return false;
  }

  public draw(ctx: CanvasRenderingContext2D, activeEffect: string | null = null) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Color de aura nativo: Azul para jugador, Rojo intenso para enemigos
    let auraColor = this.isPlayer ? '#00d2ff' : '#ff2222';
    let auraBlur = this.isPlayer ? 15 : 18;

    if (activeEffect === 'ESCUDO') {
      auraColor = '#00ffff';
      auraBlur = 25;
    } else if (activeEffect === 'ORUGA') {
      auraColor = '#00ff00';
      auraBlur = 20;
    } else if (activeEffect === 'SOBRECARGA') {
      auraColor = '#ffaa00';
      auraBlur = 22;
    } else if (activeEffect === 'ACEITE' || activeEffect === 'FALLA') {
      auraColor = '#ff0055';
      auraBlur = 20;
    } else if (activeEffect === 'ROJO' || !this.isPlayer) {
      auraColor = '#ff1111'; // Forzar aura roja brillante en bots enemigos
      auraBlur = 18;
    }

    ctx.shadowBlur = auraBlur;
    ctx.shadowColor = auraColor;

    if (activeEffect && activeEffect !== 'ROJO') {
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2 + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.imageLoaded && this.tankImage) {
      ctx.drawImage(this.tankImage, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = this.isPlayer ? '#10b981' : '#ef4444';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -4, this.width / 2 + 10, 8);
    }

    ctx.restore();
  }
}
