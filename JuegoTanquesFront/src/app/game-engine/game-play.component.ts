import { Component, ElementRef, OnInit, OnDestroy, HostListener, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { IonContent, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { GameMap } from './GameMap';
import { Tank } from './Tank';
import { Bullet } from './Bullet';
import { AimTrajectory } from './AimTrajectory';
import { TANQUES_JUEGO, ARMAS_JUEGO } from '../models/game-data';
import { ItemManager } from './ItemManager';
import { BotAI } from './BotAI';
import { AjustesService } from '../services/ajustes.service';
import { FeedbackService } from '../services/feedback.service';

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
  'TANK-01': { id: 'dash', icon: '💨', nombre: 'DASH', cooldownMs: 5500, durationMs: 320 },
  'TANK-02': { id: 'slow', icon: '☠️', nombre: 'VENENO', cooldownMs: 12000, durationMs: 6000 },
  'TANK-03': { id: 'pierce', icon: '🎯', nombre: 'PERFORANTE', cooldownMs: 9500, durationMs: 0 }
};

@Component({
  selector: 'app-game-play',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content class="game-container" [scrollY]="false">
      <div class="canvas-wrapper">
        <canvas #gameCanvas (pointermove)="onCanvasPointerMove($event)" (pointerdown)="onCanvasPointerDown($event)"></canvas>
        <button class="offline-exit" type="button" (click)="salirPartida()">SALIR ✕</button>
        @if (mostrarFps) { <div class="fps-counter">{{ fps }} FPS</div> }

        @if (roundNotice) {
          <div class="round-result-overlay" role="status">
            <div class="round-result-card">{{ roundNotice }}</div>
          </div>
        }

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
    .round-result-overlay {position:absolute;inset:0;z-index:60;display:flex;justify-content:center;align-items:center;pointer-events:none;background:rgba(0,0,0,.35)}
    .round-result-card {max-width:85%;padding:16px 22px;background:rgba(7,13,27,.93);border:2px solid #ffbf24;border-radius:16px;color:#fff;font:800 clamp(17px,3.5vw,28px)/1.35 system-ui;text-align:center;box-shadow:0 10px 35px #000}
    .game-container { --background: #000000; }
    .offline-exit { position:absolute; top:16px; right:16px; z-index:40; border:1px solid #ff526f; border-radius:9px; padding:8px 13px; color:#fff; background:rgba(110,12,30,.86); font-weight:800; cursor:pointer; }
    .fps-counter { position:absolute; top:12px; left:12px; z-index:40; padding:5px 8px; border-radius:7px; color:#8cff9b; background:rgba(0,0,0,.72); font:700 11px system-ui,sans-serif; pointer-events:none; }
    .offline-controls { position:absolute; top:16px; left:16px; z-index:20; max-width:55vw; padding:7px 10px; color:#dbe7f5; background:rgba(0,0,0,.55); border:1px solid rgba(255,255,255,.15); border-radius:8px; font:11px/1.4 system-ui,sans-serif; pointer-events:none; }
    @media (max-width:700px) { .offline-controls { display:none; } }
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

    /* === MOBILE FIRST: landscape, safe areas y HUD sin obstáculos === */
    :host { display:block; width:100%; height:100%; overflow:hidden; }
    .game-container, .online-game-content { --background:#05070b; --overflow:hidden; }
    .canvas-wrapper, .online-game-root {
      width:100%; height:100%; height:100dvh; max-width:100%; max-height:100dvh;
      overflow:hidden; position:relative; touch-action:none;
      -webkit-user-select:none; user-select:none;
    }
    canvas { width:100%; height:100%; display:block; object-fit:contain; touch-action:none; }
    .offline-controls, .pc-controls, .joystick-label { display:none !important; }
    .top-hud, .online-hud {
      position:absolute; top:max(5px, env(safe-area-inset-top)); left:50%;
      transform:translateX(-50%); width:auto; max-width:65%;
      gap:4px; margin:0; flex-wrap:nowrap; pointer-events:none;
    }
    .hud-box, .hud-pill {
      padding:5px 8px; border-width:1px; border-radius:9px;
      background:rgba(5,10,19,.8); white-space:nowrap;
      font-size:clamp(9px,1.7vw,12px); line-height:1.15;
    }
    .hud-title, .hud-timer { font-size:clamp(9px,1.7vw,12px); }
    .offline-exit, .leave-button {
      position:absolute; z-index:35; top:max(6px, env(safe-area-inset-top));
      right:max(8px, env(safe-area-inset-right));
      padding:7px 10px; border-radius:10px; font-size:11px; line-height:1.1;
    }
    .fixed-joystick-zone {
      position:absolute; bottom:max(9px, env(safe-area-inset-bottom));
      width:clamp(96px,19vh,132px); height:clamp(96px,19vh,132px);
      display:flex; align-items:center; justify-content:center; z-index:26;
      touch-action:none; -webkit-user-select:none; user-select:none;
    }
    .left-joystick { left:max(12px, env(safe-area-inset-left)); }
    .right-joystick { right:max(12px, env(safe-area-inset-right)); }
    .joystick-base { width:82%; height:82%; box-sizing:border-box; border-radius:50%; }
    .joystick-stick { width:44%; height:44%; box-sizing:border-box; border-radius:50%; }
    .ability-button-zone {
      position:absolute; z-index:28; width:clamp(56px,12vh,75px);
      height:clamp(56px,12vh,75px);
      right:max(32px, calc(env(safe-area-inset-right) + 26px));
      bottom:calc(max(9px, env(safe-area-inset-bottom)) + clamp(96px,19vh,132px) + 3px);
      touch-action:none;
    }
    .ability-icon { font-size:clamp(19px,4vh,25px); }
    .ability-text { font-size:9px; }
    .ammo-container, .online-ammo {
      position:absolute; left:50%; right:auto; bottom:max(10px, env(safe-area-inset-bottom));
      transform:translateX(-50%); display:flex; justify-content:center;
      gap:5px; z-index:24; pointer-events:none;
    }
    .ammo-pill { width:clamp(9px,1.8vw,14px); height:clamp(19px,4vh,27px); }
    .active-effect-banner, .online-effect {
      position:absolute; top:calc(max(5px, env(safe-area-inset-top)) + 38px);
      left:50%; transform:translateX(-50%); max-width:65%;
      padding:4px 9px; border-width:1px; border-radius:8px;
      font-size:11px; white-space:nowrap; pointer-events:none;
    }
    .online-message { top:22%; max-width:64%; font-size:11px; }
    .result-overlay { padding:max(8px, env(safe-area-inset-top)) 12px; }
    .result-card { max-height:94%; width:min(540px,96%); box-sizing:border-box; }
    @media (max-height:420px) {
      .fixed-joystick-zone { width:94px; height:94px; bottom:max(5px, env(safe-area-inset-bottom)); }
      .ability-button-zone { width:52px; height:52px; bottom:105px; right:max(24px, env(safe-area-inset-right)); }
      .hud-box, .hud-pill { padding:3px 6px; }
      .online-hud { max-width:68%; }
    }

    /* AJUSTE V2: cámara equilibrada y controles grandes al jugar en horizontal */
    .fixed-joystick-zone {
      width: clamp(128px, 23vh, 164px) !important;
      height: clamp(128px, 23vh, 164px) !important;
      bottom: max(14px, env(safe-area-inset-bottom)) !important;
      z-index: 26;
    }
    .left-joystick { left: max(20px, env(safe-area-inset-left)) !important; }
    .right-joystick { right: max(20px, env(safe-area-inset-right)) !important; }
    .fixed-joystick-zone .joystick-base {
      width: 84% !important;
      height: 84% !important;
      min-width: 0;
      min-height: 0;
      border: 2px solid rgba(255,255,255,.52);
      background: rgba(24,37,54,.35);
    }
    .fixed-joystick-zone .joystick-stick {
      width: 45% !important;
      height: 45% !important;
      background: rgba(255,200,70,.48);
      border: 2px solid rgba(255,230,170,.75);
    }
    .ability-button-zone {
      width: clamp(66px, 13vh, 82px) !important;
      height: clamp(66px, 13vh, 82px) !important;
      right: max(44px, calc(env(safe-area-inset-right) + 44px)) !important;
      bottom: calc(max(14px, env(safe-area-inset-bottom)) + clamp(128px, 23vh, 164px) + 7px) !important;
    }
    @media (max-height: 430px) {
      .fixed-joystick-zone { width: 126px !important; height: 126px !important; bottom: 8px !important; }
      .left-joystick { left: max(10px, env(safe-area-inset-left)) !important; }
      .right-joystick { right: max(10px, env(safe-area-inset-right)) !important; }
      .ability-button-zone { width: 64px !important; height: 64px !important; bottom: 139px !important; right: max(30px, env(safe-area-inset-right)) !important; }
    }
  `]
})
export class GamePlayComponent implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  private router = inject(Router);
  private readonly ajustesService = inject(AjustesService);
  private readonly feedback = inject(FeedbackService);

  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private gameMap!: GameMap;
  public playerTank!: Tank;
  private animationFrameId: number = 0;
  public mostrarFps = false;
  public fps = 0;
  private fpsFrames = 0;
  private fpsDesde = performance.now();
  private sensibilidadApuntado = 0.5;
  private apuntadoAsistido = true;

  public itemManager = new ItemManager();
  public activeEffect: string | null = null;
  public effectTimeLeft: number = 0;
  private effectTimerInterval: any = null;

  // ===== HABILIDAD ESPECIAL =====
  public ability: AbilityInfo = ABILIDADES['TANK-01'];
  public abilityState: AbilityState = 'listo';
  public abilityCooldown: number = 0;
  public abilityActiveLeft: number = 0;
  public abilityProgress: number = 100;
  private abilityReadyAt: number = 0;
  private abilityActiveUntil: number = 0;

  private readonly DASH_SPEED = 3.5;
  private readonly SLOW_RADIUS = 170;
  private readonly SLOW_FACTOR = 0.35;

  private dashDirX: number = 0;
  private dashDirY: number = 0;
  private perforanteArmed: boolean = false;
  private slowZone: { x: number; y: number; radius: number; endTime: number } | null = null;
  private poisonTickAt = new Map<BotAI, number>();
  private mouseAimActive = false;

  public gameConfig: any = null;
  public botAIs: BotAI[] = [];
  public rawBotsConfig: any[] = [];

  public currentRound: number = 1;
  public totalRondas: number = 5;
  public roundTimeLeft: number = 60;
  private roundTimerInterval: any = null;
  public roundNotice = '';
  private roundClosing = false;
  private matchEnded = false;
  private roundTransitionTimer: ReturnType<typeof setTimeout> | null = null;
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
  private maxRadius = 42;
  public bullets: Bullet[] = [];
  private keys: { [key: string]: boolean } = {};

  ngOnInit() {
    const ajustes = this.ajustesService.ajustes();
    this.mostrarFps = ajustes.mostrarFps;
    this.sensibilidadApuntado = ajustes.sensibilidadApuntado / 100;
    this.apuntadoAsistido = ajustes.apuntadoAsistido;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = 1280;
    canvas.height = 720;

    const navigation = this.router.getCurrentNavigation();
    const routeState = navigation?.extras?.state ?? (typeof history !== 'undefined' ? history.state : null);
    // El hangar envía config, bots y equipamientoJugador mediante Router state.
    // history.state se usa como respaldo cuando Angular ya completó la navegación.
    const state = routeState as {
      config?: any;
      bots?: any[];
      equipamientoJugador?: {
        tanque?: any;
        arma?: any;
      };
    } | null;

    if (state) {
      this.gameConfig = state.config ?? state;
      this.totalRondas = Number(this.gameConfig?.rondas) || 5;
      this.rawBotsConfig = Array.isArray(state.bots) ? state.bots : [];
    }

    // Prioridad: objeto de equipamiento enviado por OfflineComponent;
    // respaldo: identificadores de config para mantener compatibilidad.
    const tanqueRecibido = this.extraerIdentificador(
      state?.equipamientoJugador?.tanque,
      ['tanque_id', 'tanqueId', 'TanqueId', 'tankId', 'id', 'Id', 'nombre', 'Nombre']
    );
    const armaRecibida = this.extraerIdentificador(
      state?.equipamientoJugador?.arma,
      ['arma_id', 'armaId', 'ArmaId', 'weaponId', 'id', 'Id', 'nombre', 'Nombre']
    );

    const selectedTankId = this.normalizarTankId(
      tanqueRecibido ?? this.gameConfig?.tanqueSeleccionado ?? this.gameConfig?.tankId
    );
    const tankData = TANQUES_JUEGO.find(t => t.tanque_id === selectedTankId) ?? TANQUES_JUEGO[0];
    this.playerTank = new Tank(120, 120, tankData, true);
    this.ability = ABILIDADES[tankData.tanque_id] ?? ABILIDADES['TANK-01'];

    // Inicializar el mapa de juego de forma segura
    const mapaId = this.normalizarMapaId(this.gameConfig?.mapaSeleccionado);
    this.gameMap = new GameMap(mapaId);

    this.initNewRound();
    this.setWeapon(this.normalizarArmaId(
      armaRecibida ?? this.gameConfig?.armaSeleccionada ?? this.gameConfig?.weaponId
    ));

    console.log('[Game Offline] Equipamiento aplicado:', {
      tanque: tankData.tanque_id,
      arma: this.currentWeaponId,
      config: this.gameConfig
    });

    this.startGameLoop();
  }

  async ionViewWillEnter() {
    try {
      // 🟢 Al entrar a la partida, la pantalla gira automáticamente a horizontal
      await ScreenOrientation.lock({ orientation: 'landscape' });
    } catch (e) {
      console.log('Orientación no soportada en navegador web');
    }
  }

  async ionViewWillLeave() {
    try {
      // 🟢 Al salir de la partida y regresar a los menús, vuelve a vertical
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    if (this.effectTimerInterval) clearInterval(this.effectTimerInterval);
    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
    if (this.roundTransitionTimer) clearTimeout(this.roundTransitionTimer);
  }

  private initNewRound() {
    this.roundClosing = false;
    this.roundNotice = '';
    this.resetAbility();
    this.bullets = [];
    this.itemManager.activeItems = [];
    this.poisonTickAt.clear();
    this.activeEffect = null;
    this.effectTimeLeft = 0;
    if (this.effectTimerInterval) clearInterval(this.effectTimerInterval);
    this.effectTimerInterval = null;

    const playerSpawn = this.getSafeSpawnPosition(1280, 720, 'left');
    this.playerTank.x = playerSpawn.x;
    this.playerTank.y = playerSpawn.y;
    this.playerTank.currentHp = this.playerTank.tankData.vida_base;

    this.botAIs = this.rawBotsConfig.map((b, index) => {
      const spawnPos = this.getSafeSpawnPosition(1280, 720, 'right');
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

  private getSafeSpawnPosition(canvasWidth: number, canvasHeight: number, side: 'left' | 'right' = 'right'): { x: number, y: number } {
    const rows = this.gameMap.currentMap.matrizColisiones.length;
    const cols = this.gameMap.currentMap.matrizColisiones[0].length;
    const tileW = canvasWidth / cols;
    const tileH = canvasHeight / rows;
    const minX = side === 'left' ? 50 : 660;
    const maxX = side === 'left' ? 600 : 1220;
    for (let i = 0; i < 250; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = 60 + Math.random() * (canvasHeight - 120);
      const r = Math.floor(y / tileH), c = Math.floor(x / tileW);
      if (r >= 0 && r < rows && c >= 0 && c < cols && !this.gameMap.isWall(r, c)) {
        // La caja del tanque es más grande que una celda: solo acepta centros con margen.
        const margin = 20;
        const open = !this.gameMap.isWall(Math.floor((y - margin) / tileH), Math.floor((x - margin) / tileW))
          && !this.gameMap.isWall(Math.floor((y - margin) / tileH), Math.floor((x + margin) / tileW))
          && !this.gameMap.isWall(Math.floor((y + margin) / tileH), Math.floor((x - margin) / tileW))
          && !this.gameMap.isWall(Math.floor((y + margin) / tileH), Math.floor((x + margin) / tileW));
        if (open) return { x, y };
      }
    }
    return side === 'left' ? { x: 100, y: 100 } : { x: 1180, y: 620 };
  }

  /** Extrae un identificador si se recibe el objeto completo del catálogo. */
  private extraerIdentificador(valor: any, propiedades: string[]): unknown {
    if (valor === null || valor === undefined) return undefined;
    if (typeof valor !== 'object') return valor;

    for (const propiedad of propiedades) {
      const encontrado = valor[propiedad];
      if (encontrado !== null && encontrado !== undefined && String(encontrado).trim() !== '') {
        return encontrado;
      }
    }

    return undefined;
  }

  private normalizarTankId(valor: unknown): string {
    const raw = String(valor ?? '').trim().toUpperCase();

    const exacto = TANQUES_JUEGO.find(t =>
      t.tanque_id.toUpperCase() === raw || t.nombre.toUpperCase() === raw
    );
    if (exacto) return exacto.tanque_id;

    const n = Number(raw.replace(/[^0-9]/g, ''));
    if (Number.isInteger(n) && n >= 1 && n <= TANQUES_JUEGO.length) {
      return TANQUES_JUEGO[n - 1].tanque_id;
    }

    console.warn('[Game Offline] Tanque no reconocido; se usará el primero:', valor);
    return TANQUES_JUEGO[0].tanque_id;
  }

  private normalizarArmaId(valor: unknown): string {
    const raw = String(valor ?? '').trim().toUpperCase();

    const exacta = ARMAS_JUEGO.find(a =>
      a.arma_id.toUpperCase() === raw || a.nombre.toUpperCase() === raw
    );
    if (exacta) return exacta.arma_id;

    const n = Number(raw.replace(/[^0-9]/g, ''));
    if (Number.isInteger(n) && n >= 1 && n <= ARMAS_JUEGO.length) {
      return ARMAS_JUEGO[n - 1].arma_id;
    }

    console.warn('[Game Offline] Arma no reconocida; se usará la primera:', valor);
    return ARMAS_JUEGO[0].arma_id;
  }

  private normalizarMapaId(valor: string | undefined): string {
    const numero = (valor ?? '').match(/\d+/)?.[0];
    return numero && ['1', '2', '3'].includes(numero) ? `mapa_${numero}` : 'mapa_3';
  }

  private endRound(reason: 'player_dead' | 'bots_dead' | 'timeout') {
    // Una muerte y una eliminación en el mismo frame no cuentan varias veces.
    if (this.roundClosing || this.matchEnded) return;
    this.roundClosing = true;
    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);

    const ganoJugador = reason === 'bots_dead';
    if (ganoJugador) this.playerWins++;
    else this.botWins++;

    const ronda = this.currentRound;
    const requiredWins = Math.ceil(this.totalRondas / 2);
    const final = this.playerWins >= requiredWins || this.botWins >= requiredWins || ronda >= this.totalRondas;
    this.roundNotice = `${ganoJugador ? '🏆 ¡GANASTE' : '💀 LA IA GANÓ'} LA RONDA ${ronda}!`;
    if (final) {
      this.matchEnded = true;
      this.roundNotice += this.playerWins > this.botWins
        ? ' · ¡VICTORIA FINAL!'
        : this.playerWins < this.botWins ? ' · DERROTA FINAL' : ' · EMPATE FINAL';
    }
    if (this.roundTransitionTimer) clearTimeout(this.roundTransitionTimer);
    this.roundTransitionTimer = setTimeout(() => {
      if (final) {
        void this.router.navigateByUrl('/home', { replaceUrl: true });
      } else {
        this.currentRound++;
        this.initNewRound();
      }
    }, final ? 3200 : 2100);
  }

  public onAbilityPress(event: Event) {
    event.preventDefault();
    this.useSpecialAbility();
  }

  public useSpecialAbility() {
    if (this.abilityState !== 'listo') return;
    const now = Date.now();

    if (this.ability.id === 'dash') {
      let dx = this.leftJoystick.vectorX;
      let dy = this.leftJoystick.vectorY;
      if (dx === 0 && dy === 0) {
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
      }
      if (dx === 0 && dy === 0) {
        dx = Math.cos(this.playerTank.angle);
        dy = Math.sin(this.playerTank.angle);
      }
      const len = Math.hypot(dx, dy);
      this.dashDirX = dx / len;
      this.dashDirY = dy / len;
      this.beginActive(now);

    } else if (this.ability.id === 'slow') {
      this.slowZone = {
        x: this.playerTank.x,
        y: this.playerTank.y,
        radius: this.SLOW_RADIUS,
        endTime: now + this.ability.durationMs
      };
      this.beginActive(now);

    } else {
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
    this.poisonTickAt.clear();
  }

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
    this.feedback.disparo(this.currentWeaponId);

    const barrelLength = 40;
    const startX = this.playerTank.x + Math.cos(this.playerTank.turretAngle) * barrelLength;
    const startY = this.playerTank.y + Math.sin(this.playerTank.turretAngle) * barrelLength;

    let piercing = false;
    if (this.perforanteArmed) {
      piercing = true;
      this.perforanteArmed = false;
      this.startCooldown(Date.now());
    }

    if (this.currentWeaponId === 'WEAP-01') {
      for (let offset of [-0.2, 0, 0.2]) {
        const bullet = new Bullet(startX, startY, this.playerTank.turretAngle + offset, this.currentWeaponId, piercing);
        (bullet as any).isPlayer = true;
        (bullet as any).__escopeta = this.currentWeaponId === 'WEAP-01';
        (bullet as any).__origenX = bullet.x;
        (bullet as any).__origenY = bullet.y;
        this.bullets.push(bullet);
      }
    } else {
      const bullet = new Bullet(startX, startY, this.playerTank.turretAngle, this.currentWeaponId, piercing);
      (bullet as any).isPlayer = true;
      (bullet as any).__escopeta = this.currentWeaponId === 'WEAP-01';
      (bullet as any).__origenX = bullet.x;
      (bullet as any).__origenY = bullet.y;
      this.bullets.push(bullet);
    }
  }

  onCanvasPointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    this.mouseAimActive = true;
    const point = this.pointerToWorld(event);
    this.playerTank.turretAngle = Math.atan2(point.y - this.playerTank.y, point.x - this.playerTank.x);
  }

  onCanvasPointerDown(event: PointerEvent) {
    if ((event.target as HTMLElement).closest('.fixed-joystick-zone,.ability-button-zone,button')) return;
    event.preventDefault();
    if (event.pointerType === 'touch') return;
    this.mouseAimActive = true;
    const point = this.pointerToWorld(event);
    this.playerTank.turretAngle = Math.atan2(point.y - this.playerTank.y, point.x - this.playerTank.x);
    this.triggerShot();
  }

  /** Cámara móvil: agranda visualmente los tanques sin alterar colisiones ni coordenadas de red. */
  private cameraZoom = 1;
  private cameraX = 0;
  private cameraY = 0;
  private beginCameraFrame(): void {
    const viewport = this.canvasRef.nativeElement;
    const rect = viewport.getBoundingClientRect();
    const isMobile = Math.min(rect.width, rect.height) <= 650;
    const target = this.playerTank ? { x: this.playerTank.x, y: this.playerTank.y } : { x: 640, y: 360 };
    // Acercamiento visual, no modifica la escala de físicas, balas o SignalR.
    this.cameraZoom = isMobile ? 1.035 : 1.0;
    const viewW = 1280 / this.cameraZoom;
    const viewH = 720 / this.cameraZoom;
    this.cameraX = Math.max(0, Math.min(1280 - viewW, target.x - viewW / 2));
    this.cameraY = Math.max(0, Math.min(720 - viewH, target.y - viewH / 2));
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, 1280, 720);
    this.ctx.save();
    this.ctx.setTransform(this.cameraZoom, 0, 0, this.cameraZoom,
      -this.cameraX * this.cameraZoom, -this.cameraY * this.cameraZoom);
  }

  private pointerToWorld(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    // Canvas 16:9 con object-fit:contain: compensar las barras laterales/superiores.
    const displayScale = Math.min(rect.width / 1280, rect.height / 720);
    const visibleW = 1280 * displayScale;
    const visibleH = 720 * displayScale;
    const localX = (event.clientX - rect.left - (rect.width - visibleW) / 2) / displayScale;
    const localY = (event.clientY - rect.top - (rect.height - visibleH) / 2) / displayScale;
    return {
      x: Math.max(0, Math.min(1280, this.cameraX + localX / this.cameraZoom)),
      y: Math.max(0, Math.min(720, this.cameraY + localY / this.cameraZoom))
    };
  }

  public salirPartida(): void {
    if (this.roundTransitionTimer) clearTimeout(this.roundTransitionTimer);
    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
    if (this.effectTimerInterval) clearInterval(this.effectTimerInterval);
    cancelAnimationFrame(this.animationFrameId);
    void this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    this.keys[key] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (!event.repeat && key === 'e') this.useSpecialAbility();
    if (!event.repeat && (key === ' ' || key === 'enter')) this.triggerShot();
  }
  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) { this.keys[event.key.toLowerCase()] = false; }

  @HostListener('window:blur')
  handleWindowBlur() { this.keys = {}; this.leftJoystick.vectorX = this.leftJoystick.vectorY = 0; this.rightJoystick.vectorX = this.rightJoystick.vectorY = 0; }

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
      if (Math.hypot(j.stickX, j.stickY) < 10 && this.apuntadoAsistido) { this.triggerAutoAimAndShot(); }
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
        if (Math.hypot(j.stickX, j.stickY) < 10 && this.apuntadoAsistido) { this.triggerAutoAimAndShot(); }
        else { this.triggerShot(); }
      }
      j.active = false; j.stickX = 0; j.stickY = 0; j.vectorX = 0; j.vectorY = 0;
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
    };

    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
  }

  private updateGame() {
    if (this.roundClosing || this.matchEnded) return;
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
    const inputLength = Math.hypot(dx, dy);
    if (!this.isDashing && inputLength > 1) { dx /= inputLength; dy /= inputLength; }

    if (this.isDashing) {
      this.playerTank.move(this.dashDirX * this.DASH_SPEED, this.dashDirY * this.DASH_SPEED, this.gameMap, 1280, 720);
    } else if (dx !== 0 || dy !== 0) {
      this.playerTank.move(dx, dy, this.gameMap, 1280, 720);
    }

    if (this.rightJoystick.vectorX !== 0 || this.rightJoystick.vectorY !== 0) {
      this.playerTank.turretAngle = this.suavizarAngulo(
        this.playerTank.turretAngle,
        Math.atan2(this.rightJoystick.vectorY, this.rightJoystick.vectorX)
      );
    }

    this.botAIs.forEach(bot => {
      const inside = this.slowZone && now < this.slowZone.endTime
        ? Math.hypot(bot.tank.x - this.slowZone.x, bot.tank.y - this.slowZone.y) < this.slowZone.radius
        : false;
      bot.speedMultiplier = inside ? this.SLOW_FACTOR : 1;
      // La zona Juggernaut aplica veneno periódico además de reducir la velocidad.
      if (inside && now - (this.poisonTickAt.get(bot) ?? 0) >= 950) {
        this.poisonTickAt.set(bot, now);
        bot.tank.currentHp = Math.max(0, bot.tank.currentHp - 8);
      }
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
          if (dist < 35) {
            bullet.active = false;
            const baseDamage = bullet.isPiercing ? 50 : 34;
            const damageMultiplier = this.activeEffect === 'SOBRECARGA' ? 1.5 : 1;
            bot.tank.currentHp = Math.max(0, bot.tank.currentHp - Math.round(baseDamage * damageMultiplier));
            this.feedback.impactoEnemigo();
          }
        });
      } else if (!this.isDashing) {
        const dist = Math.hypot(bullet.x - this.playerTank.x, bullet.y - this.playerTank.y);
        if (dist < 35) {
          bullet.active = false;
          if (this.activeEffect !== 'ESCUDO') {
            this.playerTank.currentHp -= 20;
            this.feedback.impactoRecibido();
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
      // Escopeta: alcance máximo de 260 unidades del mundo.
      if ((b as any).__escopeta) {
        const x0 = (b as any).__origenX;
        const y0 = (b as any).__origenY;
        if (typeof x0 === 'number' && typeof y0 === 'number' &&
          Math.hypot(b.x - x0, b.y - y0) >= 260) b.active = false;
      }
    });
    this.bullets = this.bullets.filter(b => b.active);
  }

  // Aumenta SOLO el dibujo del tanque, nunca el mapa ni su hitbox.
  private drawMobileTank(tank: Tank, effect: string | null): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const factor = Math.min(rect.width, rect.height) <= 650 ? 1.16 : 1;
    this.ctx.save();
    this.ctx.translate(tank.x, tank.y);
    this.ctx.scale(factor, factor);
    this.ctx.translate(-tank.x, -tank.y);
    tank.draw(this.ctx, effect);
    this.ctx.restore();
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
    this.actualizarFps();
    this.updateGame();
    this.beginCameraFrame();
    this.gameMap.draw(this.ctx, 1280, 720);

    this.drawSlowZone();
    this.itemManager.draw(this.ctx);

    this.drawMobileTank(this.playerTank, this.activeEffect);
    this.drawHealthBar(this.playerTank, this.playerTank.tankData.vida_base);

    this.botAIs.forEach(bot => {
      this.drawMobileTank(bot.tank, null);
      this.drawHealthBar(bot.tank, bot.tank.tankData.vida_base);
    });

    this.bullets.forEach(b => b.draw(this.ctx));

    if (this.mouseAimActive || this.rightJoystick.vectorX !== 0 || this.rightJoystick.vectorY !== 0) {
      AimTrajectory.draw(
        this.ctx, this.playerTank.x, this.playerTank.y,
        this.playerTank.turretAngle, this.currentWeaponId,
        this.gameMap, 1280, 720
      );
    }

    this.ctx.restore(); // termina la cámara: la próxima frame inicia limpia
    this.animationFrameId = requestAnimationFrame(this.startGameLoop);
  }

  private suavizarAngulo(actual: number, objetivo: number): number {
    const diferencia = Math.atan2(Math.sin(objetivo - actual), Math.cos(objetivo - actual));
    const factor = 0.08 + this.sensibilidadApuntado * 0.42;
    return actual + diferencia * factor;
  }

  private actualizarFps(): void {
    this.fpsFrames++;
    const ahora = performance.now();
    const transcurrido = ahora - this.fpsDesde;
    if (transcurrido >= 1000) {
      this.fps = Math.round(this.fpsFrames * 1000 / transcurrido);
      this.fpsFrames = 0;
      this.fpsDesde = ahora;
    }
  }
}
