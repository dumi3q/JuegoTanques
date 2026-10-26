import { Component, ElementRef, OnInit, OnDestroy, HostListener, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { GameMap } from './GameMap';
import { Tank } from './Tank';
import { Bullet } from './Bullet';
import { AimTrajectory } from './AimTrajectory';
import { TANQUES_JUEGO, ARMAS_JUEGO } from '../models/game-data';
import { ItemManager } from './ItemManager';
import { BotAI } from './BotAI';

type AbilityId = 'dash' | 'slow' | 'pierce';
type AbilityState = 'listo' | 'armada' | 'activa' | 'recarga';

interface AbilityInfo {
  id: AbilityId;
  icon: string;
  nombre: string;
  cooldownMs: number; // tiempo de recarga
  durationMs: number; // cuánto dura el efecto activo
}

const ABILIDADES: { [tankId: string]: AbilityInfo } = {
  'TANK-01': { id: 'dash', icon: '💨', nombre: 'DASH', cooldownMs: 6000, durationMs: 200 },
  'TANK-02': { id: 'slow', icon: '🌀', nombre: 'RALENTIZAR', cooldownMs: 12000, durationMs: 5000 },
  'TANK-03': { id: 'pierce', icon: '🔮', nombre: 'PERFORANTE', cooldownMs: 10000, durationMs: 0 }
};

@Component({
  selector: 'app-game-play',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content class="game-container" [scrollY]="false">
      <div class="canvas-wrapper">
        <canvas #gameCanvas></canvas>

        <div class="top-hud">
          <div class="hud-box round-box">
            <span class="hud-title">RONDA {{ currentRound }} / {{ totalRondas }}</span>
            <span class="hud-timer">⏱️ {{ roundTimeLeft }}s | 🤖 Restantes: {{ botAIs.length }}</span>
          </div>
        </div>

        <!-- HUD DE MUNICIÓN -->
        <div class="ammo-container">
          @for (loaded of ammoSlots; track $index) {
            <div class="ammo-pill" 
                 [class.filled]="loaded" 
                 [class.empty]="!loaded">
            </div>
          }
        </div>

        <!-- BOTÓN DE HABILIDAD ESPECIAL -->
        <div class="ability-button-zone" (pointerdown)="onAbilityPress($event)">
          <div class="ability-circle"
               [ngClass]="'ability-' + ability.id + ' state-' + abilityState"
               [style.--p]="abilityProgress + '%'">
            <div class="ability-inner">
              <span class="ability-icon">{{ ability.icon }}</span>
              <span class="ability-text">{{ abilityLabel }}</span>
            </div>
          </div>
        </div>

        @if (activeEffect) {
          <div class="active-effect-banner">
            <span class="effect-title">{{ activeEffect }}</span>
            <span class="effect-timer">{{ effectTimeLeft }}s</span>
          </div>
        }

        <div class="fixed-joystick-zone left-joystick"
             (touchstart)="onJoystickStart($event, 'left')"
             (touchmove)="onJoystickMove($event, 'left')"
             (touchend)="onJoystickEnd('left')"
             (mousedown)="onMouseDown($event, 'left')">
          <div class="joystick-base">
            <div class="joystick-stick" [style.transform]="'translate(' + leftJoystick.stickX + 'px, ' + leftJoystick.stickY + 'px)'"></div>
          </div>
          <span class="joystick-label">MOVER</span>
        </div>

        <div class="fixed-joystick-zone right-joystick"
             (touchstart)="onJoystickStart($event, 'right')"
             (touchmove)="onJoystickMove($event, 'right')"
             (touchend)="onJoystickEnd('right')"
             (mousedown)="onMouseDown($event, 'right')">
          <div class="joystick-base">
            <div class="joystick-stick" [style.transform]="'translate(' + rightJoystick.stickX + 'px, ' + rightJoystick.stickY + 'px)'"></div>
          </div>
          <span class="joystick-label">APUNTAR / DISPARAR</span>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .game-container { --background: #000000; }
    .canvas-wrapper {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100vw;
      height: 100vh;
      background-color: #000;
      overflow: hidden;
      user-select: none;
    }
    canvas { width: 100%; height: 100%; object-fit: contain; display: block; }

    .top-hud {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      z-index: 20;
    }
    .hud-box {
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid rgba(255, 170, 0, 0.6);
      padding: 8px 20px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      backdrop-filter: blur(4px);
    }
    .round-box { border-color: #ffaa00; }
    .hud-title { color: #fff; font-size: 14px; font-weight: bold; }
    .hud-timer { color: #ffaa00; font-size: 12px; margin-top: 2px; }

    /* ===== BOTÓN DE HABILIDAD ===== */
    .ability-button-zone {
      position: absolute;
      bottom: 155px;
      right: 50px;
      width: 80px;
      height: 80px;
      z-index: 25;
      cursor: pointer;
      touch-action: none;
    }
    .ability-circle {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      padding: 5px;
      box-sizing: border-box;
      background: var(--c);
      box-shadow: 0 0 15px var(--c);
      transition: transform 0.1s ease;
    }
    .ability-circle:active { transform: scale(0.92); }
    .ability-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(20,20,20,0.55) 0%, rgba(0,0,0,0.9) 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .ability-icon { font-size: 22px; }
    .ability-text { color: #fff; font-size: 10px; font-weight: bold; margin-top: 2px; text-shadow: 0 1px 2px #000; }

    /* Color según la habilidad */
    .ability-dash   { --c: #00d2ff; }
    .ability-slow   { --c: #b266ff; }
    .ability-pierce { --c: #ff4d6d; }

    /* Recargando: gris con un anillo que se va llenando */
    .state-recarga {
      background: conic-gradient(var(--c) var(--p), #3a3a3a 0);
      box-shadow: none;
    }
    .state-recarga .ability-icon { opacity: 0.4; }

    /* Armada: pulsa para avisarte que tu próxima bala es especial */
    .state-armada { animation: armedPulse 0.5s ease-in-out infinite alternate; }
    @keyframes armedPulse {
      from { box-shadow: 0 0 10px var(--c); transform: scale(1); }
      to   { box-shadow: 0 0 30px 8px var(--c); transform: scale(1.1); }
    }

    /* Activa: brilla fuerte mientras dura el efecto */
    .state-activa { box-shadow: 0 0 28px 8px var(--c); filter: brightness(1.5); }

    .ammo-container {
      position: absolute;
      bottom: 60px;
      right: 175px;
      display: flex;
      gap: 6px;
      z-index: 15;
    }
    .ammo-pill {
      width: 14px;
      height: 28px;
      border-radius: 7px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.1);
      transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }
    .ammo-pill.filled { background: #ffaa00; box-shadow: 0 0 12px #ffaa00; transform: scale(1.05); }
    .ammo-pill.empty { background: rgba(255, 255, 255, 0.05); box-shadow: none; transform: scale(0.95); }

    .active-effect-banner {
      position: absolute;
      top: 85px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.75);
      border: 2px solid #ffaa00;
      padding: 6px 16px;
      border-radius: 10px;
      display: flex;
      gap: 10px;
      align-items: center;
      z-index: 20;
    }
    .effect-title { color: #ffaa00; font-weight: bold; font-size: 13px; }
    .effect-timer { color: #ffffff; font-size: 13px; background: rgba(255, 255, 255, 0.15); padding: 2px 6px; border-radius: 4px; }

    .fixed-joystick-zone {
      position: absolute;
      bottom: 30px;
      width: 130px;
      height: 130px;
      z-index: 10;
      touch-action: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .left-joystick { left: 30px; }
    .right-joystick { right: 30px; }

    .joystick-base {
      width: 100px;
      height: 100px;
      background: rgba(255, 255, 255, 0.08);
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 50%;
      backdrop-filter: blur(6px);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .joystick-stick {
      width: 45px;
      height: 45px;
      background: rgba(255, 255, 255, 0.3);
      border: 2px solid rgba(255, 255, 255, 0.6);
      border-radius: 50%;
    }
    .joystick-label {
      color: rgba(255, 255, 255, 0.5);
      font-size: 9px;
      font-weight: bold;
      margin-top: 6px;
      letter-spacing: 0.5px;
    }
  `]
})
export class GamePlayComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private gameMap = new GameMap('mapa_3');
  public playerTank!: Tank;
  private animationFrameId: number = 0;

  public itemManager = new ItemManager();
  public activeEffect: string | null = null;
  public effectTimeLeft: number = 0;
  private effectTimerInterval: any = null;

  // ===== HABILIDAD ESPECIAL =====
  public ability: AbilityInfo = ABILIDADES['TANK-01'];
  public abilityState: AbilityState = 'listo';
  public abilityCooldown: number = 0;     // segundos que faltan para recargar
  public abilityActiveLeft: number = 0;   // segundos que faltan de efecto activo
  public abilityProgress: number = 100;   // 0 a 100, para el anillo del botón
  private abilityReadyAt: number = 0;
  private abilityActiveUntil: number = 0;

  private readonly DASH_SPEED = 3.5;   // multiplicador de velocidad durante el dash
  private readonly SLOW_RADIUS = 170;  // tamaño de la zona de ralentización
  private readonly SLOW_FACTOR = 0.35; // los bots se mueven al 35% de su velocidad

  private dashDirX: number = 0;
  private dashDirY: number = 0;
  private perforanteArmed: boolean = false;
  private slowZone: { x: number; y: number; radius: number; endTime: number } | null = null;

  public gameConfig: any = null;
  public botAIs: BotAI[] = [];
  public rawBotsConfig: any[] = [];

  public currentRound: number = 1;
  public totalRondas: number = 5;
  public roundTimeLeft: number = 60;
  private roundTimerInterval: any = null;
  public playerWins: number = 0;
  public botWins: number = 0;

  public currentWeaponId: string = 'WEAP-02';
  public maxAmmo: number = 4;
  public currentAmmo: number = 4;
  public ammoSlots: boolean[] = [true, true, true, true];
  private reloadTimePerAmmo: number = 1000;
  private lastAmmoConsumeTime: number = 0;

  public leftJoystick = { active: false, stickX: 0, stickY: 0, vectorX: 0, vectorY: 0, identifier: null as number | null };
  public rightJoystick = { active: false, stickX: 0, stickY: 0, vectorX: 0, vectorY: 0, identifier: null as number | null };
  private maxRadius = 30;
  public bullets: Bullet[] = [];
  private keys: { [key: string]: boolean } = {};

  ngOnInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = 1280;
    canvas.height = 720;

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { config: any, bots: any[] };

    if (state) {
      this.gameConfig = state.config;
      this.totalRondas = Number(this.gameConfig?.rondas) || 5;
      this.rawBotsConfig = state.bots || [];
    }

    const tankData = TANQUES_JUEGO[0]; // 0 = Scout, 1 = Juggernaut, 2 = Vanguardia
    this.playerTank = new Tank(180, 360, tankData, true);
    this.ability = ABILIDADES[tankData.tanque_id];

    this.initNewRound();
    this.setWeapon('WEAP-03');
    this.startGameLoop();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    if (this.effectTimerInterval) clearInterval(this.effectTimerInterval);
    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
  }

  private initNewRound() {
    this.resetAbility();

    this.playerTank.x = 180;
    this.playerTank.y = 360;
    this.playerTank.currentHp = this.playerTank.tankData.vida_base;

    this.botAIs = this.rawBotsConfig.map((b, index) => {
      const spawnPos = this.getSafeSpawnPosition(1280, 720);
      const enemyTank = new Tank(spawnPos.x, spawnPos.y, b.tanque, false);
      enemyTank.currentHp = b.tanque.vida_base;
      return new BotAI(enemyTank, b.dificultad, b.arma.arma_id);
    });

    this.roundTimeLeft = 60;
    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
    this.roundTimerInterval = setInterval(() => {
      this.roundTimeLeft--;
      if (this.roundTimeLeft <= 0) {
        this.endRound('timeout');
      }
    }, 1000);
  }

  private getSafeSpawnPosition(canvasWidth: number, canvasHeight: number): { x: number, y: number } {
    const rows = this.gameMap.currentMap.matrizColisiones.length;
    const cols = this.gameMap.currentMap.matrizColisiones[0].length;
    const tileW = canvasWidth / cols;
    const tileH = canvasHeight / rows;

    for (let i = 0; i < 50; i++) {
      const x = 700 + Math.random() * 500;
      const y = 100 + Math.random() * 520;

      const r = Math.floor(y / tileH);
      const c = Math.floor(x / tileW);

      if (r >= 0 && r < rows && c >= 0 && c < cols && !this.gameMap.isWall(r, c)) {
        return { x, y };
      }
    }
    return { x: 950, y: 360 };
  }

  private endRound(reason: 'player_dead' | 'bots_dead' | 'timeout') {
    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);

    if (reason === 'bots_dead') {
      this.playerWins++;
    } else {
      this.botWins++;
    }

    const requiredWins = Math.ceil(this.totalRondas / 2);
    if (this.playerWins >= requiredWins || this.botWins >= requiredWins || this.currentRound >= this.totalRondas) {
      alert(this.playerWins > this.botWins ? '🏆 ¡VICTORIA GLOBAL DE LA PARTIDA!' : '💀 ¡DERROTA GLOBAL!');
      this.router.navigate(['/home']);
      return;
    }

    this.currentRound++;
    this.initNewRound();
  }

  // ===================== HABILIDAD ESPECIAL =====================
  public onAbilityPress(event: Event) {
    event.preventDefault();
    this.useSpecialAbility();
  }

  public useSpecialAbility() {
    if (this.abilityState !== 'listo') return; // solo se usa cuando está lista
    const now = Date.now();

    if (this.ability.id === 'dash') {
      // La dirección del dash es hacia donde te estás moviendo
      let dx = this.leftJoystick.vectorX;
      let dy = this.leftJoystick.vectorY;
      if (dx === 0 && dy === 0) {
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
      }
      // Si no te mueves, el dash va hacia donde mira el tanque
      if (dx === 0 && dy === 0) {
        dx = Math.cos(this.playerTank.angle);
        dy = Math.sin(this.playerTank.angle);
      }
      const len = Math.hypot(dx, dy);
      this.dashDirX = dx / len;
      this.dashDirY = dy / len;
      this.beginActive(now);

    } else if (this.ability.id === 'slow') {
      // Crea una zona en el piso donde estás parado
      this.slowZone = {
        x: this.playerTank.x,
        y: this.playerTank.y,
        radius: this.SLOW_RADIUS,
        endTime: now + this.ability.durationMs
      };
      this.beginActive(now);

    } else {
      // Perforante: queda "armada" hasta que dispares
      this.perforanteArmed = true;
      this.abilityState = 'armada';
    }
  }

  private beginActive(now: number) {
    this.abilityState = 'activa';
    this.abilityActiveUntil = now + this.ability.durationMs;
    this.abilityActiveLeft = Math.ceil(this.ability.durationMs / 1000);
  }

  private startCooldown(now: number) {
    this.abilityState = 'recarga';
    this.abilityReadyAt = now + this.ability.cooldownMs;
    this.abilityProgress = 0;
  }

  private resetAbility() {
    this.abilityState = 'listo';
    this.abilityCooldown = 0;
    this.abilityProgress = 100;
    this.perforanteArmed = false;
    this.slowZone = null;
  }

  // Se llama en cada frame para actualizar los estados y los contadores
  private updateAbility(now: number) {
    if (this.abilityState === 'activa') {
      this.abilityActiveLeft = Math.max(0, Math.ceil((this.abilityActiveUntil - now) / 1000));
      if (now >= this.abilityActiveUntil) this.startCooldown(now);
    }

    if (this.abilityState === 'recarga') {
      const left = this.abilityReadyAt - now;
      if (left <= 0) {
        this.abilityState = 'listo';
        this.abilityCooldown = 0;
        this.abilityProgress = 100;
      } else {
        this.abilityCooldown = Math.ceil(left / 1000);
        this.abilityProgress = (1 - left / this.ability.cooldownMs) * 100;
      }
    }

    if (this.slowZone && now >= this.slowZone.endTime) this.slowZone = null;
  }

  public get isDashing(): boolean {
    return this.abilityState === 'activa' && this.ability.id === 'dash';
  }

  // Texto que se ve dentro del botón
  public get abilityLabel(): string {
    switch (this.abilityState) {
      case 'recarga': return this.abilityCooldown + 's';
      case 'armada': return 'ARMADA';
      case 'activa': return this.ability.id === 'dash' ? '¡YA!' : this.abilityActiveLeft + 's';
      default: return 'LISTO';
    }
  }

  private drawSlowZone() {
    if (!this.slowZone) return;
    const z = this.slowZone;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(160, 80, 255, ${0.12 + pulse * 0.08})`;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(190, 120, 255, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 8]);
    this.ctx.stroke();
    this.ctx.restore();
  }

  // ===================== ARMAS Y POWER-UPS =====================
  public setWeapon(weaponId: string) {
    this.currentWeaponId = weaponId;
    if (weaponId === 'WEAP-03') { this.maxAmmo = 2; this.reloadTimePerAmmo = 1400; }
    else if (weaponId === 'WEAP-01') { this.maxAmmo = 3; this.reloadTimePerAmmo = 1100; }
    else { this.maxAmmo = 4; this.reloadTimePerAmmo = 900; }
    this.currentAmmo = this.maxAmmo;
    this.updateAmmoHUD();
  }

  public applyPowerUp(tipo: string) {
    this.activeEffect = tipo.toUpperCase();
    this.effectTimeLeft = 10;

    if (tipo === 'botiquin') {
      this.playerTank.currentHp = Math.min(this.playerTank.tankData.vida_base, this.playerTank.currentHp + 30);
    } else if (tipo === 'escudo') {
      this.effectTimeLeft = 10;
    } else if (tipo === 'sobrecarga') {
      this.effectTimeLeft = 10;
    }

    if (this.effectTimerInterval) clearInterval(this.effectTimerInterval);
    this.effectTimerInterval = setInterval(() => {
      this.effectTimeLeft--;
      if (this.effectTimeLeft <= 0) {
        this.activeEffect = null;
        clearInterval(this.effectTimerInterval);
        this.effectTimerInterval = null;
      }
    }, 1000);
  }

  private updateAmmoHUD() {
    this.ammoSlots = Array.from({ length: this.maxAmmo }, (_, i) => i < this.currentAmmo);
  }

  private triggerAutoAimAndShot() {
    if (this.activeEffect === 'FALLA' || this.currentAmmo <= 0) return;
    if (this.botAIs.length > 0) {
      let closestBot = this.botAIs[0].tank;
      let minDistance = Math.hypot(closestBot.x - this.playerTank.x, closestBot.y - this.playerTank.y);

      this.botAIs.forEach(b => {
        const dist = Math.hypot(b.tank.x - this.playerTank.x, b.tank.y - this.playerTank.y);
        if (dist < minDistance) { minDistance = dist; closestBot = b.tank; }
      });
      this.playerTank.turretAngle = Math.atan2(closestBot.y - this.playerTank.y, closestBot.x - this.playerTank.x);
    }
    this.triggerShot();
  }

  private triggerShot() {
    if (this.activeEffect === 'FALLA' || this.currentAmmo <= 0) return;
    this.currentAmmo--;
    this.updateAmmoHUD();
    this.lastAmmoConsumeTime = Date.now();

    const barrelLength = 40;
    const startX = this.playerTank.x + Math.cos(this.playerTank.turretAngle) * barrelLength;
    const startY = this.playerTank.y + Math.sin(this.playerTank.turretAngle) * barrelLength;

    // ¿La habilidad Perforante está armada? Entonces ESTA bala es la especial
    let piercing = false;
    if (this.perforanteArmed) {
      piercing = true;
      this.perforanteArmed = false;
      this.startCooldown(Date.now()); // la recarga empieza al disparar
    }

    if (this.currentWeaponId === 'WEAP-01') {
      for (let offset of [-0.2, 0, 0.2]) {
        const bullet = new Bullet(startX, startY, this.playerTank.turretAngle + offset, this.currentWeaponId, piercing);
        (bullet as any).isPlayer = true;
        this.bullets.push(bullet);
      }
    } else {
      const bullet = new Bullet(startX, startY, this.playerTank.turretAngle, this.currentWeaponId, piercing);
      (bullet as any).isPlayer = true;
      this.bullets.push(bullet);
    }
  }

  // ===================== CONTROLES =====================
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    this.keys[event.key.toLowerCase()] = true;
    if (event.key === 'e' || event.key === ' ') {
      this.useSpecialAbility();
    }
  }
  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) { this.keys[event.key.toLowerCase()] = false; }

  onJoystickStart(event: TouchEvent, side: 'left' | 'right') {
    event.preventDefault();
    const touch = event.changedTouches[0];
    const j = side === 'left' ? this.leftJoystick : this.rightJoystick;
    j.active = true; j.identifier = touch.identifier;
  }

  onJoystickMove(event: TouchEvent, side: 'left' | 'right') {
    event.preventDefault();
    const j = side === 'left' ? this.leftJoystick : this.rightJoystick;
    if (!j.active) return;
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch.identifier === j.identifier) {
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const deltaX = touch.clientX - (rect.left + rect.width / 2);
        const deltaY = touch.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(deltaX, deltaY);
        if (distance <= this.maxRadius) {
          j.stickX = deltaX; j.stickY = deltaY;
          j.vectorX = deltaX / this.maxRadius; j.vectorY = deltaY / this.maxRadius;
        } else {
          j.stickX = (deltaX / distance) * this.maxRadius; j.stickY = (deltaY / distance) * this.maxRadius;
          j.vectorX = deltaX / distance; j.vectorY = deltaY / distance;
        }
      }
    }
  }

  onJoystickEnd(side: 'left' | 'right') {
    const j = side === 'left' ? this.leftJoystick : this.rightJoystick;
    if (side === 'right' && j.active) {
      if (Math.hypot(j.stickX, j.stickY) < 10) { this.triggerAutoAimAndShot(); }
      else { this.triggerShot(); }
    }
    j.active = false; j.stickX = 0; j.stickY = 0; j.vectorX = 0; j.vectorY = 0; j.identifier = null;
  }

  onMouseDown(event: MouseEvent, side: 'left' | 'right') {
    event.preventDefault();
    const j = side === 'left' ? this.leftJoystick : this.rightJoystick;
    j.active = true;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseMoveHandler = (e: MouseEvent) => {
      const deltaX = e.clientX - centerX; const deltaY = e.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance <= this.maxRadius) {
        j.stickX = deltaX; j.stickY = deltaY;
        j.vectorX = deltaX / this.maxRadius; j.vectorY = deltaY / this.maxRadius;
      } else {
        j.stickX = (deltaX / distance) * this.maxRadius; j.stickY = (deltaY / distance) * this.maxRadius;
        j.vectorX = deltaX / distance; j.vectorY = deltaY / distance;
      }
    };

    const mouseUpHandler = () => {
      if (side === 'right' && j.active) {
        if (Math.hypot(j.stickX, j.stickY) < 10) { this.triggerAutoAimAndShot(); }
        else { this.triggerShot(); }
      }
      j.active = false; j.stickX = 0; j.stickY = 0; j.vectorX = 0; j.vectorY = 0;
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
    };

    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
  }

  // ===================== BUCLE DEL JUEGO =====================
  private updateGame() {
    const now = Date.now();
    this.updateAbility(now);

    let dx = 0; let dy = 0;
    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    let speedMultiplier = 1;
    if (this.activeEffect === 'ORUGA') speedMultiplier = 0.5;
    else if (this.activeEffect === 'ACEITE') speedMultiplier = 0.4;

    if (this.leftJoystick.vectorX !== 0 || this.leftJoystick.vectorY !== 0) {
      dx = this.leftJoystick.vectorX * speedMultiplier;
      dy = this.leftJoystick.vectorY * speedMultiplier;
    }

    if (this.isDashing) {
      // Durante el dash te mueves rápido en la dirección guardada
      this.playerTank.move(this.dashDirX * this.DASH_SPEED, this.dashDirY * this.DASH_SPEED, this.gameMap, 1280, 720);
    } else if (dx !== 0 || dy !== 0) {
      this.playerTank.move(dx, dy, this.gameMap, 1280, 720);
    }

    if (this.rightJoystick.vectorX !== 0 || this.rightJoystick.vectorY !== 0) {
      this.playerTank.turretAngle = Math.atan2(this.rightJoystick.vectorY, this.rightJoystick.vectorX);
    }

    // Zona de ralentización: los bots dentro de ella se mueven más lento
    this.botAIs.forEach(bot => {
      const inside = this.slowZone
        ? Math.hypot(bot.tank.x - this.slowZone.x, bot.tank.y - this.slowZone.y) < this.slowZone.radius
        : false;
      bot.speedMultiplier = inside ? this.SLOW_FACTOR : 1;
    });

    this.botAIs.forEach(bot => {
      bot.update(this.playerTank, this.gameMap, 1280, 720, this.bullets);
    });

    this.itemManager.update(this.gameMap, 1280, 720, this.playerTank, (tipo) => {
      this.applyPowerUp(tipo);
    });

    this.bullets.forEach(bullet => {
      if (!bullet.active) return;
      if ((bullet as any).isPlayer) {
        this.botAIs.forEach(bot => {
          const dist = Math.hypot(bullet.x - bot.tank.x, bullet.y - bot.tank.y);
          if (dist < 35) { bullet.active = false; bot.tank.currentHp -= 34; }
        });
      } else if (!this.isDashing) { // durante el dash las balas enemigas no te pegan
        const dist = Math.hypot(bullet.x - this.playerTank.x, bullet.y - this.playerTank.y);
        if (dist < 35) {
          bullet.active = false;
          if (this.activeEffect !== 'ESCUDO') {
            this.playerTank.currentHp -= 20;
            if (this.playerTank.currentHp <= 0) { this.endRound('player_dead'); }
          }
        }
      }
    });

    this.botAIs = this.botAIs.filter(bot => bot.tank.currentHp > 0);
    if (this.botAIs.length === 0) { this.endRound('bots_dead'); }

    if (this.currentAmmo < this.maxAmmo) {
      const elapsed = now - this.lastAmmoConsumeTime;
      const reloadSpeed = this.activeEffect === 'SOBRECARGA' ? this.reloadTimePerAmmo / 2 : this.reloadTimePerAmmo;
      const ammoToRestore = Math.floor(elapsed / reloadSpeed);
      if (ammoToRestore > 0) {
        this.currentAmmo = Math.min(this.maxAmmo, this.currentAmmo + ammoToRestore);
        this.lastAmmoConsumeTime += ammoToRestore * reloadSpeed;
        this.updateAmmoHUD();
      }
    }

    this.bullets.forEach(b => {
      b.update(this.gameMap, 1280, 720);
    });
    this.bullets = this.bullets.filter(b => b.active);
  }

  private drawHealthBar(tank: Tank, maxHp: number) {
    const barWidth = 50;
    const barHeight = 6;
    const x = tank.x - barWidth / 2;
    const y = tank.y - 45;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    const hpPercent = Math.max(0, tank.currentHp / maxHp);
    this.ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.2 ? '#f1c40f' : '#e74c3c';
    this.ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, barWidth, barHeight);
  }

  private startGameLoop = () => {
    this.updateGame();
    this.ctx.clearRect(0, 0, 1280, 720);
    this.gameMap.draw(this.ctx, 1280, 720);

    this.drawSlowZone();

    this.itemManager.draw(this.ctx);

    this.playerTank.draw(this.ctx, this.activeEffect);
    this.drawHealthBar(this.playerTank, this.playerTank.tankData.vida_base);

    this.botAIs.forEach(bot => {
      bot.tank.draw(this.ctx, null);
      this.drawHealthBar(bot.tank, bot.tank.tankData.vida_base);
    });

    this.bullets.forEach(b => b.draw(this.ctx));

    if (this.rightJoystick.vectorX !== 0 || this.rightJoystick.vectorY !== 0) {
      AimTrajectory.draw(
        this.ctx, this.playerTank.x, this.playerTank.y,
        this.playerTank.turretAngle, this.currentWeaponId,
        this.gameMap, 1280, 720
      );
    }
    this.setWeapon('WEAP-02');

    const tankData = TANQUES_JUEGO[2]; // 0 = Scout, 1 = Juggernaut, 2 = Vanguardia
    this.animationFrameId = requestAnimationFrame(this.startGameLoop);
  }
}
