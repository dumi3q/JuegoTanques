import { Tank } from './Tank';
import { GameMap } from './GameMap';
import { Bullet } from './Bullet';

type BotState = 'PATRULLA' | 'PERSECUCION' | 'BUSQUEDA';
type Point = { x: number; y: number };

export class BotAI {
  public reactionTimer: number = 0;
  private lastShotTime: number = 0;

  // ---------- Estado general ----------
  private state: BotState = 'PATRULLA';

  // ---------- Camino (pathfinding) ----------
  private path: Point[] = [];
  private lastPathTime: number = 0;
  private pathTargetKey: string = '';

  // ---------- Patrulla ----------
  private patrolTarget: Point | null = null;

  // ---------- Búsqueda ----------
  private searchTarget: Point | null = null;
  private searchPhase: 'ir' | 'mirar' = 'ir';
  private searchPointsLeft: number = 0;
  private lookUntil: number = 0;
  private phaseStart: number = 0;

  // ---------- Movimiento lateral (strafe) ----------
  private strafeDir: number = 1;
  private nextStrafeChange: number = 0;

  // ---------- Detector de atascos ----------
  private lastPosX: number = 0;
  private lastPosY: number = 0;
  private lastStuckCheck: number = 0;
  private wantsToMove: boolean = false;
  private isStuck: boolean = false;

  constructor(
    public tank: Tank,
    public dificultad: 'facil' | 'normal' | 'dificil',
    public assignedWeaponId: string
  ) {
    this.lastPosX = tank.x;
    this.lastPosY = tank.y;
  }

  // =====================================================
  //  CONFIGURACIÓN POR DIFICULTAD (aquí ajustas todo)
  // =====================================================
  private get visionRange(): number {
    return this.dificultad === 'facil' ? 350 : this.dificultad === 'normal' ? 500 : 700;
  }

  public speedMultiplier: number = 1; // 1 = normal, 0.35 = ralentizado

  private get speed(): number {
    const base = this.dificultad === 'facil' ? 0.9 : this.dificultad === 'normal' ? 1.3 : 1.7;
    return base * this.speedMultiplier;
  }
  // Distancia mínima y máxima que el bot quiere mantener contigo
  private get minDistance(): number {
    return this.dificultad === 'facil' ? 180 : this.dificultad === 'normal' ? 230 : 260;
  }
  private get maxDistance(): number {
    return this.dificultad === 'facil' ? 300 : this.dificultad === 'normal' ? 340 : 380;
  }

  private get fireCooldown(): number {
    return this.dificultad === 'facil' ? 2200 : this.dificultad === 'normal' ? 1400 : 900;
  }

  // =====================================================
  //  UPDATE PRINCIPAL
  // =====================================================
  public update(playerTank: Tank, gameMap: GameMap, canvasWidth: number, canvasHeight: number, bulletsArray: Bullet[]) {
    const now = Date.now();
    this.checkStuck(now);

    const sees = this.canSeePlayer(playerTank, gameMap, canvasWidth, canvasHeight);

    // --- Cambios de estado ---
    if (sees) {
      this.state = 'PERSECUCION';
    } else if (this.state === 'PERSECUCION') {
      // Te acaba de perder: va a buscar donde te vio por última vez
      this.state = 'BUSQUEDA';
      this.searchTarget = { x: playerTank.x, y: playerTank.y };
      this.searchPhase = 'ir';
      this.searchPointsLeft = 3;
      this.phaseStart = now;
      this.path = [];
    }

    // --- Comportamiento según el estado ---
    if (this.state === 'PERSECUCION') {
      this.doChase(playerTank, gameMap, canvasWidth, canvasHeight, bulletsArray, now);
    } else if (this.state === 'BUSQUEDA') {
      this.doSearch(gameMap, canvasWidth, canvasHeight, now);
    } else {
      this.doPatrol(gameMap, canvasWidth, canvasHeight);
    }
  }

  // =====================================================
  //  ESTADO: PERSECUCIÓN (con distancia)
  // =====================================================
  private doChase(player: Tank, gameMap: GameMap, w: number, h: number, bullets: Bullet[], now: number) {
    const dx = player.x - this.tank.x;
    const dy = player.y - this.tank.y;
    const dist = Math.hypot(dx, dy);

    // Apuntar con margen de error según dificultad
    const angleToPlayer = Math.atan2(dy, dx);
    let errorMargin = 0;
    if (this.dificultad === 'facil') errorMargin = (Math.random() - 0.5) * 0.3;
    else if (this.dificultad === 'normal') errorMargin = (Math.random() - 0.5) * 0.1;
    this.tank.turretAngle = angleToPlayer + errorMargin;

    // Disparar
    if (now - this.lastShotTime > this.fireCooldown) {
      this.lastShotTime = now;
      this.shoot(bullets);
    }

    // Dirección hacia ti (normalizada)
    const dirX = dx / dist;
    const dirY = dy / dist;

    if (dist < this.minDistance) {
      // MUY CERCA: retrocede (si hay pared atrás, mejor se mueve de lado)
      const backX = this.tank.x - dirX * 45;
      const backY = this.tank.y - dirY * 45;
      if (this.isFree(backX, backY, gameMap, w, h)) {
        this.moveDir(-dirX, -dirY, this.speed, gameMap, w, h);
      } else {
        this.strafe(dirX, dirY, gameMap, w, h, now);
      }
    } else if (dist > this.maxDistance) {
      // MUY LEJOS: se acerca usando el camino
      this.goTo(player.x, player.y, this.speed, gameMap, w, h);
    } else {
      // DISTANCIA BUENA: se mueve de lado esquivando
      this.strafe(dirX, dirY, gameMap, w, h, now);
    }
  }

  // Movimiento lateral: perpendicular a la dirección hacia el jugador
  private strafe(dirX: number, dirY: number, gameMap: GameMap, w: number, h: number, now: number) {
    // Cambia de lado de vez en cuando (más impredecible)
    if (now > this.nextStrafeChange) {
      if (Math.random() < 0.5) this.strafeDir *= -1;
      this.nextStrafeChange = now + 1500 + Math.random() * 1500;
    }

    let perpX = -dirY * this.strafeDir;
    let perpY = dirX * this.strafeDir;

    // Si hay pared adelante, cambia de lado
    if (!this.isFree(this.tank.x + perpX * 45, this.tank.y + perpY * 45, gameMap, w, h)) {
      this.strafeDir *= -1;
      perpX = -perpX;
      perpY = -perpY;
    }

    this.moveDir(perpX, perpY, this.speed * 0.8, gameMap, w, h);
  }

  // =====================================================
  //  ESTADO: BÚSQUEDA
  // =====================================================
  private doSearch(gameMap: GameMap, w: number, h: number, now: number) {
    if (!this.searchTarget) {
      this.state = 'PATRULLA';
      return;
    }

    if (this.searchPhase === 'ir') {
      this.goTo(this.searchTarget.x, this.searchTarget.y, this.speed, gameMap, w, h);
      this.tank.turretAngle = this.tank.angle; // mira hacia donde camina

      const dist = Math.hypot(this.searchTarget.x - this.tank.x, this.searchTarget.y - this.tank.y);
      const tooLong = now - this.phaseStart > 6000; // si tarda mucho, se rinde con este punto
      if (dist < 40 || tooLong) {
        this.searchPhase = 'mirar';
        this.lookUntil = now + 1800;
      }
    } else {
      // Gira la torreta mirando alrededor
      this.tank.turretAngle += 0.07;

      if (now > this.lookUntil) {
        this.searchPointsLeft--;
        if (this.searchPointsLeft <= 0) {
          // No te encontró: vuelve a patrullar
          this.state = 'PATRULLA';
          this.searchTarget = null;
          this.patrolTarget = null;
          this.path = [];
        } else {
          // Revisa otro punto cerca de donde te vio
          const next = this.randomFreeTile(gameMap, w, h, this.searchTarget, 4);
          if (next) this.searchTarget = next;
          this.searchPhase = 'ir';
          this.phaseStart = now;
          this.path = [];
        }
      }
    }
  }

  // =====================================================
  //  ESTADO: PATRULLA
  // =====================================================
  private doPatrol(gameMap: GameMap, w: number, h: number) {
    const arrived = this.patrolTarget
      ? Math.hypot(this.patrolTarget.x - this.tank.x, this.patrolTarget.y - this.tank.y) < 40
      : true;

    // Si no tiene destino, llegó, o está atascado: escoge uno nuevo (y lejos)
    if (!this.patrolTarget || arrived || this.isStuck) {
      for (let i = 0; i < 10; i++) {
        const t = this.randomFreeTile(gameMap, w, h);
        if (t && Math.hypot(t.x - this.tank.x, t.y - this.tank.y) > 200) {
          this.patrolTarget = t;
          this.path = [];
          break;
        }
      }
    }

    if (this.patrolTarget) {
      this.goTo(this.patrolTarget.x, this.patrolTarget.y, this.speed * 0.7, gameMap, w, h);
      this.tank.turretAngle = this.tank.angle; // la torreta mira hacia donde camina
    }
  }

  // =====================================================
  //  MOVIMIENTO Y PATHFINDING
  // =====================================================
  private moveDir(dirX: number, dirY: number, speed: number, gameMap: GameMap, w: number, h: number) {
    this.wantsToMove = true;
    this.tank.move(dirX * speed, dirY * speed, gameMap, w, h);
  }

  // Va hacia un punto del mapa siguiendo un camino que rodea los muros
  private goTo(tx: number, ty: number, speed: number, gameMap: GameMap, w: number, h: number) {
    const now = Date.now();
    const { tileW, tileH } = this.grid(gameMap, w, h);
    const key = Math.floor(tx / tileW) + ',' + Math.floor(ty / tileH);

    // Recalcula el camino si cambió el destino, cada 600ms, o si está atascado
    if (key !== this.pathTargetKey || now - this.lastPathTime > 600 || this.isStuck) {
      this.path = this.findPath(this.tank.x, this.tank.y, tx, ty, gameMap, w, h);
      this.pathTargetKey = key;
      this.lastPathTime = now;
    }

    // Quita los puntos del camino que ya alcanzó
    while (this.path.length > 0) {
      const wp = this.path[0];
      if (Math.hypot(wp.x - this.tank.x, wp.y - this.tank.y) < 12) this.path.shift();
      else break;
    }
    if (this.path.length === 0) return;

    const wp = this.path[0];
    const dx = wp.x - this.tank.x;
    const dy = wp.y - this.tank.y;
    const d = Math.hypot(dx, dy);
    if (d > 0) this.moveDir(dx / d, dy / d, speed, gameMap, w, h);
  }

  // BFS: busca el camino más corto por casillas libres (arriba, abajo, izquierda, derecha)
  private findPath(sx: number, sy: number, ex: number, ey: number, gameMap: GameMap, w: number, h: number): Point[] {
    const { rows, cols, tileW, tileH } = this.grid(gameMap, w, h);

    const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v));
    const sr = clamp(Math.floor(sy / tileH), rows);
    const sc = clamp(Math.floor(sx / tileW), cols);
    const er = clamp(Math.floor(ey / tileH), rows);
    const ec = clamp(Math.floor(ex / tileW), cols);

    if (this.isBlocked(gameMap, er, ec)) return [];

    const startIdx = sr * cols + sc;
    const endIdx = er * cols + ec;
    const visited: boolean[] = new Array(rows * cols).fill(false);
    const prev: number[] = new Array(rows * cols).fill(-1);
    const queue: number[] = [startIdx];
    visited[startIdx] = true;

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let head = 0;
    let found = false;

    while (head < queue.length) {
      const cur = queue[head++];
      if (cur === endIdx) { found = true; break; }
      const r = Math.floor(cur / cols);
      const c = cur % cols;

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (this.isBlocked(gameMap, nr, nc)) continue;
        const idx = nr * cols + nc;
        if (visited[idx]) continue;
        visited[idx] = true;
        prev[idx] = cur;
        queue.push(idx);
      }
    }

    if (!found) return [];

    // Reconstruye el camino desde el final hasta el inicio
    const result: Point[] = [];
    let cur = endIdx;
    while (cur !== startIdx) {
      const r = Math.floor(cur / cols);
      const c = cur % cols;
      result.push({ x: (c + 0.5) * tileW, y: (r + 0.5) * tileH });
      cur = prev[cur];
    }
    return result.reverse();
  }

  // =====================================================
  //  VISIÓN
  // =====================================================
  private canSeePlayer(player: Tank, gameMap: GameMap, w: number, h: number): boolean {
    const dist = Math.hypot(player.x - this.tank.x, player.y - this.tank.y);
    if (dist > this.visionRange) return false; // ¡muy lejos para verte!

    const { tileW, tileH } = this.grid(gameMap, w, h);
    // Más pasos cuanto más lejos esté, para no "saltarse" muros delgados
    const steps = Math.ceil(dist / (Math.min(tileW, tileH) / 2));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const checkX = this.tank.x + (player.x - this.tank.x) * t;
      const checkY = this.tank.y + (player.y - this.tank.y) * t;
      const r = Math.floor(checkY / tileH);
      const c = Math.floor(checkX / tileW);
      if (this.isBlocked(gameMap, r, c)) return false;
    }
    return true;
  }

  // =====================================================
  //  UTILIDADES
  // =====================================================
  private grid(gameMap: GameMap, w: number, h: number) {
    const rows = gameMap.currentMap.matrizColisiones.length;
    const cols = gameMap.currentMap.matrizColisiones[0].length;
    return { rows, cols, tileW: w / cols, tileH: h / rows };
  }

  // true si la casilla es muro o está fuera del mapa
  private isBlocked(gameMap: GameMap, r: number, c: number): boolean {
    const rows = gameMap.currentMap.matrizColisiones.length;
    const cols = gameMap.currentMap.matrizColisiones[0].length;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
    return gameMap.isWall(r, c);
  }

  // true si el punto (x, y) está sobre una casilla libre
  private isFree(x: number, y: number, gameMap: GameMap, w: number, h: number): boolean {
    const { tileW, tileH } = this.grid(gameMap, w, h);
    return !this.isBlocked(gameMap, Math.floor(y / tileH), Math.floor(x / tileW));
  }

  // Escoge una casilla libre al azar (en todo el mapa, o cerca de un punto)
  private randomFreeTile(gameMap: GameMap, w: number, h: number, around?: Point, radiusTiles: number = 0): Point | null {
    const { rows, cols, tileW, tileH } = this.grid(gameMap, w, h);

    for (let i = 0; i < 40; i++) {
      let r: number;
      let c: number;
      if (around) {
        const baseR = Math.floor(around.y / tileH);
        const baseC = Math.floor(around.x / tileW);
        r = baseR + Math.floor((Math.random() * 2 - 1) * radiusTiles);
        c = baseC + Math.floor((Math.random() * 2 - 1) * radiusTiles);
      } else {
        r = Math.floor(Math.random() * rows);
        c = Math.floor(Math.random() * cols);
      }
      if (!this.isBlocked(gameMap, r, c)) {
        return { x: (c + 0.5) * tileW, y: (r + 0.5) * tileH };
      }
    }
    return null;
  }

  // Revisa cada 700ms si el bot quería moverse pero casi no avanzó
  private checkStuck(now: number) {
    if (now - this.lastStuckCheck < 700) return;
    const moved = Math.hypot(this.tank.x - this.lastPosX, this.tank.y - this.lastPosY);
    this.isStuck = this.wantsToMove && moved < 5;

    if (this.isStuck) {
      this.strafeDir *= -1;
      this.path = [];
    }

    this.lastPosX = this.tank.x;
    this.lastPosY = this.tank.y;
    this.lastStuckCheck = now;
    this.wantsToMove = false;
  }

  private shoot(bulletsArray: Bullet[]) {
    const barrelLength = 40;
    const startX = this.tank.x + Math.cos(this.tank.turretAngle) * barrelLength;
    const startY = this.tank.y + Math.sin(this.tank.turretAngle) * barrelLength;

    bulletsArray.push(new Bullet(startX, startY, this.tank.turretAngle, this.assignedWeaponId, false));
  }
}
