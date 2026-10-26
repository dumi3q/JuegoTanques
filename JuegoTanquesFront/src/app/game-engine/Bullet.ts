import { GameMap } from './GameMap';

export class Bullet {
  public x: number;
  public y: number;
  private vx: number;
  private vy: number;
  public active: boolean = true;
  public weaponId: string;
  private bounceCount: number = 0;
  private maxBounces: number = 0;
  private piercing: boolean = false; // true = traspasa paredes (habilidad Perforante)
  private angle: number = 0;
  private lifetime: number = 0;

  constructor(startX: number, startY: number, angle: number, weaponId: string, piercing: boolean = false) {
    this.x = startX;
    this.y = startY;
    this.angle = angle;
    this.weaponId = weaponId;
    this.piercing = piercing;

    let speed = 8;

    switch (weaponId) {
      case 'WEAP-01': // Escopeta
        speed = 9;
        this.maxBounces = 0;
        break;
      case 'WEAP-02': // Cañón de Rebote
        speed = 8;
        this.maxBounces = 3;
        break;
      case 'WEAP-03': // Francotirador
        speed = 16;
        this.maxBounces = 0;
        break;
      default:
        speed = 8;
        break;
    }

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  public update(gameMap: GameMap, canvasWidth: number, canvasHeight: number) {
    if (!this.active) return;

    this.lifetime++;
    if (this.weaponId === 'WEAP-03' && this.lifetime > 50) {
      this.active = false;
      return;
    }
    if (this.piercing && this.lifetime > 120) { // la bala perforante no vive para siempre
      this.active = false;
      return;
    }

    const nextX = this.x + this.vx;
    const nextY = this.y + this.vy;

    // 1. Si sale del canvas, siempre muere
    if (nextX < 0 || nextX > canvasWidth || nextY < 0 || nextY > canvasHeight) {
      this.active = false;
      return;
    }

    const rows = gameMap.currentMap.matrizColisiones.length;
    const cols = gameMap.currentMap.matrizColisiones[0].length;
    const tileW = canvasWidth / cols;
    const tileH = canvasHeight / rows;

    const r = Math.floor(nextY / tileH);
    const c = Math.floor(nextX / tileW);

    // 2. ¿Hay una pared adelante?
    if (gameMap.isWall(r, c)) {
      if (this.piercing) {
        // Perforante: pasa por encima de la pared
        this.x = nextX;
        this.y = nextY;
      } else if (this.maxBounces > 0 && this.bounceCount < this.maxBounces) {
        this.handleBounce(nextX, nextY, tileW, tileH, gameMap);
      } else {
        this.active = false;
      }
    } else {
      this.x = nextX;
      this.y = nextY;
    }
  }

  private handleBounce(nextX: number, nextY: number, tileW: number, tileH: number, gameMap: GameMap) {
    const currentR = Math.floor(this.y / tileH);
    const currentC = Math.floor(this.x / tileW);
    const targetR = Math.floor(nextY / tileH);
    const targetC = Math.floor(nextX / tileW);

    if (targetC !== currentC && gameMap.isWall(currentR, targetC)) {
      this.vx = -this.vx;
    }
    if (targetR !== currentR && gameMap.isWall(targetR, currentC)) {
      this.vy = -this.vy;
    }

    this.angle = Math.atan2(this.vy, this.vx);
    this.bounceCount++;
    this.x += this.vx * 1.5;
    this.y += this.vy * 1.5;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.piercing) {
      // Bala de plasma: se ve distinta a todas las demás
      ctx.fillStyle = '#ff4d6d';
      ctx.shadowColor = '#ff4d6d';
      ctx.shadowBlur = 22;
      ctx.fillRect(-16, -3, 26, 6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.weaponId === 'WEAP-01') {
      ctx.fillStyle = '#ff4500';
      ctx.shadowColor = '#ff4500';
      ctx.shadowBlur = 8;
      ctx.fillRect(-6, -3, 10, 6);
    } else if (this.weaponId === 'WEAP-02') {
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.fillRect(-12, -2, 20, 4);
    }

    ctx.restore();
  }
}
