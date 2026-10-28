import { GameMap } from './GameMap';

/** Mira predictiva: visual únicamente; no sustituye las colisiones reales de Bullet. */
export class AimTrajectory {
  public static draw(
    ctx: CanvasRenderingContext2D,
    tankX: number,
    tankY: number,
    turretAngle: number,
    weaponId: string,
    gameMap: GameMap,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const barrelLength = 40;
    const sx = tankX + Math.cos(turretAngle) * barrelLength;
    const sy = tankY + Math.sin(turretAngle) * barrelLength;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (weaponId === 'WEAP-01') {
      const spread = 0.35;
      const range = 180;
      const left = this.traceToWall(sx, sy, turretAngle - spread, range, gameMap, canvasWidth, canvasHeight);
      const right = this.traceToWall(sx, sy, turretAngle + spread, range, gameMap, canvasWidth, canvasHeight);
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(left.x, left.y); ctx.lineTo(right.x, right.y); ctx.closePath();
      ctx.fillStyle = 'rgba(255,69,0,.13)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,100,40,.65)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(left.x, left.y); ctx.moveTo(sx, sy); ctx.lineTo(right.x, right.y); ctx.stroke();
    } else if (weaponId === 'WEAP-02') {
      const first = this.traceToWall(sx, sy, turretAngle, 600, gameMap, canvasWidth, canvasHeight);
      ctx.strokeStyle = 'rgba(0,255,204,.78)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(first.x, first.y); ctx.stroke();
      if (first.hit) {
        const normalAngle = first.normal === 'vertical' ? Math.PI - turretAngle : -turretAngle;
        const reflected = this.traceToWall(first.x + Math.cos(normalAngle) * 2, first.y + Math.sin(normalAngle) * 2,
          normalAngle, 200, gameMap, canvasWidth, canvasHeight);
        ctx.strokeStyle = 'rgba(255,0,204,.78)'; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(first.x, first.y); ctx.lineTo(reflected.x, reflected.y); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.arc(first.x, first.y, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      const end = this.traceToWall(sx, sy, turretAngle, 1000, gameMap, canvasWidth, canvasHeight);
      ctx.strokeStyle = 'rgba(0,230,255,.82)'; ctx.lineWidth = 1.5; ctx.shadowColor = '#00e6ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(end.x, end.y); ctx.stroke();
      ctx.shadowBlur = 0;
      if (end.hit) { ctx.fillStyle = '#00e6ff'; ctx.beginPath(); ctx.arc(end.x, end.y, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  private static traceToWall(
    sx: number, sy: number, angle: number, maxRange: number,
    gameMap: GameMap, canvasWidth: number, canvasHeight: number
  ): { x: number; y: number; hit: boolean; normal: 'vertical' | 'horizontal' | null } {
    const matrix = gameMap.currentMap.matrizColisiones;
    const tileW = canvasWidth / matrix[0].length;
    const tileH = canvasHeight / matrix.length;
    const step = 3;
    let x = sx, y = sy;
    for (let distance = 0; distance < maxRange; distance += step) {
      const nx = x + Math.cos(angle) * step;
      const ny = y + Math.sin(angle) * step;
      const row = Math.floor(ny / tileH), col = Math.floor(nx / tileW);
      if (nx < 0 || ny < 0 || nx >= canvasWidth || ny >= canvasHeight || gameMap.isWall(row, col)) {
        const prevRow = Math.floor(y / tileH), prevCol = Math.floor(x / tileW);
        const normal = prevCol !== col ? 'vertical' : 'horizontal';
        return { x, y, hit: true, normal };
      }
      x = nx; y = ny;
    }
    return { x, y, hit: false, normal: null };
  }
}
