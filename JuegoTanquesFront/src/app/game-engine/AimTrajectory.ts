import { GameMap } from './GameMap';

export class AimTrajectory {

  /**
   * Dibuja la línea o cono de trayectoria basado en el arma equipada
   * @param ctx Contexto 2D del canvas
   * @param tankX Posición X del tanque
   * @param tankY Posición Y del tanque
   * @param turretAngle Ángulo actual de la torreta en radianes
   * @param weaponId ID del arma equipada ('WEAP-01', 'WEAP-02', 'WEAP-03')
   * @param gameMap Instancia del mapa actual para calcular colisiones con muros
   */
  public static draw(
    ctx: CanvasRenderingContext2D,
    tankX: number,
    tankY: number,
    turretAngle: number,
    weaponId: string,
    gameMap: GameMap,
    canvasWidth: number,
    canvasHeight: number
  ) {
    // 1. Calcular punto de salida en la punta de la torreta (asumiendo un cañón de unos 35px de largo)
    const barrelLength = 40;
    const startX = tankX + Math.cos(turretAngle) * barrelLength;
    const startY = tankY + Math.sin(turretAngle) * barrelLength;

    ctx.save();

    switch (weaponId) {
      case 'WEAP-01': // Escopeta de Dispersión (Cono de dispersión corto)
        this.drawShotgunCone(ctx, startX, startY, turretAngle);
        break;

      case 'WEAP-02': // Cañón de Rebote Geométrico (Línea con rebote en muro)
        this.drawBounceLine(ctx, startX, startY, turretAngle, gameMap, canvasWidth, canvasHeight);
        break;

      case 'WEAP-03': // Rifle Francotirador / Vanguard (Línea recta larga y fina)
      default:
        this.drawSniperLine(ctx, startX, startY, turretAngle, gameMap, canvasWidth, canvasHeight);
        break;
    }

    ctx.restore();
  }

  // --- GUÍA 1: Escopeta (Cono corto de perdigones) ---
  private static drawShotgunCone(ctx: CanvasRenderingContext2D, startX: number, startY: number, angle: number) {
    const spreadAngle = 0.35; // Ancho del cono
    const range = 180;        // Alcance corto

    const leftAngle = angle - spreadAngle;
    const rightAngle = angle + spreadAngle;

    const endLeftX = startX + Math.cos(leftAngle) * range;
    const endLeftY = startY + Math.sin(leftAngle) * range;
    const endRightX = startX + Math.cos(rightAngle) * range;
    const endRightY = startY + Math.sin(rightAngle) * range;

    // Relleno translúcido del cono de dispersión
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endLeftX, endLeftY);
    ctx.lineTo(endRightX, endRightY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 69, 0, 0.15)';
    ctx.fill();

    // Bordes punteados del cono
    ctx.strokeStyle = 'rgba(255, 69, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endLeftX, endLeftY);
    ctx.moveTo(startX, startY);
    ctx.lineTo(endRightX, endRightY);
    ctx.stroke();
  }

  // --- GUÍA 2: Cañón de Rebote (Simula choque contra el primer muro '1') ---
  // --- GUÍA 2: Cañón de Rebote (Calcula impacto y simula el primer rebote) ---
  private static drawBounceLine(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    angle: number,
    gameMap: GameMap,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const maxRange = 600;
    const step = 4;
    let currentX = startX;
    let currentY = startY;

    let hitX = startX + Math.cos(angle) * maxRange;
    let hitY = startY + Math.sin(angle) * maxRange;
    let collided = false;
    let hitNormalX = 0;
    let hitNormalY = 0;

    const rows = gameMap.currentMap.matrizColisiones.length;
    const cols = gameMap.currentMap.matrizColisiones[0].length;
    const tileW = canvasWidth / cols;
    const tileH = canvasHeight / rows;

    // 1. Trayectoria inicial hasta chocar con el muro
    for (let d = 0; d < maxRange; d += step) {
      const nextX = currentX + Math.cos(angle) * step;
      const nextY = currentY + Math.sin(angle) * step;

      const r = Math.floor(nextY / tileH);
      const c = Math.floor(nextX / tileW);

      if (gameMap.isWall(r, c)) {
        hitX = currentX;
        hitY = currentY;
        collided = true;

        // Detectar de qué dirección vino el golpe para calcular la normal aproximada
        const prevR = Math.floor(currentY / tileH);
        const prevC = Math.floor((currentX - Math.cos(angle) * step) / tileW);
        if (prevC !== c) {
          hitNormalX = prevC < c ? -1 : 1; // Choque lateral
          hitNormalY = 0;
        } else {
          hitNormalX = 0;
          hitNormalY = prevR < r ? -1 : 1; // Choque vertical
        }
        break;
      }
      currentX = nextX;
      currentY = nextY;
    }

    // Dibujar primera línea (del cañón al muro)
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(hitX, hitY);
    ctx.stroke();

    // 2. Si hubo colisión, calcular y dibujar el segmento del rebote
    if (collided) {
      // Fórmula de reflexión física: R = V - 2(V · N)N
      const vx = Math.cos(angle);
      const vy = Math.sin(angle);
      const dot = vx * hitNormalX + vy * hitNormalY;
      const reflectVx = vx - 2 * dot * hitNormalX;
      const reflectVy = vy - 2 * dot * hitNormalY;
      const reflectAngle = Math.atan2(reflectVy, reflectVx);

      const bounceLength = 200; // Alcance visual del rebote
      const bounceEndX = hitX + Math.cos(reflectAngle) * bounceLength;
      const bounceEndY = hitY + Math.sin(reflectAngle) * bounceLength;

      // Dibujar la línea reflejada
      ctx.strokeStyle = 'rgba(255, 0, 204, 0.7)'; // Cambia a rosado/neón para diferenciar el rebote
      ctx.beginPath();
      ctx.moveTo(hitX, hitY);
      ctx.lineTo(bounceEndX, bounceEndY);
      ctx.stroke();
    }

    // Punto de impacto principal
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(hitX, hitY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // --- GUÍA 3: Francotirador / Vanguard (Línea recta láser larga) ---
  private static drawSniperLine(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    angle: number,
    gameMap: GameMap,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const maxRange = 1000;
    const endX = startX + Math.cos(angle) * maxRange;
    const endY = startY + Math.sin(angle) * maxRange;

    // Línea láser fina de alta precisión
    ctx.strokeStyle = 'rgba(0, 230, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e6ff';
    ctx.shadowBlur = 8; // Efecto brillante de mira láser
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}
