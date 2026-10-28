import {
  Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { IonContent } from '@ionic/angular';
import { SignalrService } from '../services/signalr';
import { GameMap } from './GameMap';
import { Tank } from './Tank';
import { Bullet } from './Bullet';
import { AimTrajectory } from './AimTrajectory';
import { TANQUES_JUEGO, Tanque } from '../models/game-data';
import { codigoArma, codigoTanque } from '../models/CatalogoUtil';

interface OnlinePlayer {
  usuarioId: number;
  nombre: string;
  slot: number;
  equipoId: number;
  esHost: boolean;
  tank: Tank;
  weaponId: string;
  targetX: number;
  targetY: number;
  targetAngle: number;
  targetTurret: number;
  vidas: number;
  eliminado: boolean;
}

interface OnlineBullet {
  id: string;
  ownerId: number;
  teamId: number;
  bullet: Bullet;
  hitRequested: boolean;
}

interface OnlinePowerUp {
  id: string;
  x: number;
  y: number;
  tipo: string;
}

@Component({
  selector: 'app-online-game',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content class="online-game-content" [scrollY]="false">
      <div class="online-game-root">
        <canvas #gameCanvas
                (pointermove)="onCanvasPointerMove($event)"
                (pointerdown)="onCanvasPointerDown($event)"></canvas>

        <div class="online-hud">
          <div class="hud-pill">RONDA {{ currentRound }} / {{ totalRounds }}</div>
          <div class="hud-pill">⏱ {{ roundTimeLeft }}s</div>
          <div class="hud-pill" [class.team-mode]="modoEquipos">
            {{ modoEquipos ? 'EQUIPOS' : 'TODOS CONTRA TODOS' }}
          </div>
          <div class="hud-pill lives-pill">❤️ {{ myPlayer?.vidas ?? 0 }} vidas</div>
        </div>

        <div class="online-ammo" aria-label="Munición disponible">
          @for (slot of ammoSlots; track $index) {
            <div class="ammo-pill" [class.filled]="slot" [class.empty]="!slot"></div>
          }
        </div>

        @if (activeEffect) {
          <div class="online-effect">{{ activeEffect }} <small>{{ effectSecondsLeft }}s</small></div>
        }

        <div class="fixed-joystick-zone left-joystick"
             (pointerdown)="onStickPointerDown($event, 'left')"
             (pointermove)="onStickPointerMove($event, 'left')"
             (pointerup)="onStickPointerUp($event, 'left')"
             (pointercancel)="onStickPointerUp($event, 'left')">
          <div class="joystick-base">
            <div class="joystick-stick" [style.transform]="leftStickTransform"></div>
          </div>
          <span class="joystick-label">MOVER</span>
        </div>

        <div class="fixed-joystick-zone right-joystick"
             (pointerdown)="onStickPointerDown($event, 'right')"
             (pointermove)="onStickPointerMove($event, 'right')"
             (pointerup)="onStickPointerUp($event, 'right')"
             (pointercancel)="onStickPointerUp($event, 'right')">
          <div class="joystick-base">
            <div class="joystick-stick" [style.transform]="rightStickTransform"></div>
          </div>
          <span class="joystick-label">APUNTAR / DISPARAR</span>
        </div>

        <div class="ability-button-zone" (pointerdown)="onAbilityPress($event)" role="button" tabindex="0" aria-label="Activar habilidad especial">
          <div class="ability-circle"
               [class.ability-dash]="abilityType === 'dash'"
               [class.ability-slow]="abilityType === 'slow'"
               [class.ability-pierce]="abilityType === 'pierce'"
               [class.state-recarga]="abilityState === 'recarga'"
               [class.state-armada]="abilityState === 'armada'"
               [style.--p]="abilityProgress + '%'">
            <div class="ability-inner">
              <span class="ability-icon">{{ abilityIcon }}</span>
              <span class="ability-text">{{ abilityLabel }}</span>
              @if (abilityState === 'recarga') { <small>{{ abilitySecondsLeft }}s</small> }
              @else if (abilityState === 'armada') { <small>LISTA</small> }
            </div>
          </div>
        </div>
        <button class="leave-button" type="button" (click)="salirPartida()">SALIR</button>

        @if (message) { <div class="online-message">{{ message }}</div> }

        @if (roundNotice && !partidaTerminada) {
          <div class="round-result-overlay" role="status"><div class="round-result-card">{{ roundNotice }}</div></div>
        }

        @if (partidaTerminada) {
          <div class="result-overlay">
            <div class="result-card">
              <h2>PARTIDA FINALIZADA</h2>
              @if (resultados.length === 0) {
                <p>La partida terminó, pero el servidor no devolvió la tabla de resultados.</p>
              }
              @for (r of resultados; track r.usuarioId ?? r.UsuarioId ?? $index) {
                <div class="result-row">
                  <div>
                    <strong>#{{ r.posicion }} {{ r.nombre }}</strong>
                    <small>{{ r.kills }} eliminaciones</small>
                  </div>
                  <div class="result-rewards">
                    <span>+{{ r.xpGanada }} XP</span>
                    <span>+{{ r.monedasGanadas }} monedas</span>
                    <small>Nivel {{ r.nivel }}{{ r.subioNivel ? ' ↑' : '' }}</small>
                  </div>
                </div>
              }
              <button type="button" (click)="volverAlLobby()">VOLVER AL LOBBY</button>
            </div>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    :host { display:block; height:100%; }
    .online-game-content { --background:#000; }
    .online-game-root { position:relative; display:flex; justify-content:center; align-items:center; width:100vw; height:100dvh; overflow:hidden; background:#000; touch-action:none; user-select:none; }
    canvas { display:block; width:100%; height:100%; object-fit:contain; touch-action:none; }
    .online-hud { position:absolute; top:20px; left:50%; transform:translateX(-50%); z-index:20; display:flex; flex-wrap:wrap; justify-content:center; gap:7px; width:min(95vw,900px); pointer-events:none; }
    .hud-pill { color:#fff; background:rgba(0,0,0,.8); border:2px solid rgba(0,210,255,.6); border-radius:10px; padding:8px 12px; font:700 12px/1.2 system-ui,sans-serif; backdrop-filter:blur(4px); }
    .hud-pill.team-mode { border-color:#b266ff; }
    .lives-pill { border-color:#ff6584; }

    /* HUD de munición colocado como en GamePlayComponent offline. */
    .online-ammo { position:absolute; bottom:60px; right:175px; display:flex; gap:6px; z-index:15; pointer-events:none; }
    .ammo-pill { width:14px; height:28px; box-sizing:border-box; border-radius:7px; border:2px solid rgba(255,255,255,.4); background:rgba(255,255,255,.1); transition:background .2s,box-shadow .2s,transform .2s; }
    .ammo-pill.filled { background:#ffaa00; box-shadow:0 0 12px #ffaa00; transform:scale(1.05); }
    .ammo-pill.empty { background:rgba(255,255,255,.05); box-shadow:none; transform:scale(.95); }

    .online-effect { position:absolute; top:85px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.75); color:#ffaa00; padding:6px 16px; border:2px solid #ffaa00; border-radius:10px; z-index:20; display:flex; align-items:center; gap:10px; font:bold 13px system-ui,sans-serif; pointer-events:none; }
    .online-effect small { color:white; background:rgba(255,255,255,.15); padding:2px 6px; border-radius:4px; }

    /* Joysticks: mismas dimensiones y posiciones que el modo offline. */
    .fixed-joystick-zone { position:absolute; bottom:30px; width:130px; height:130px; z-index:10; touch-action:none; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; }
    .left-joystick { left:30px; } .right-joystick { right:30px; }
    .joystick-base { width:100px; height:100px; box-sizing:border-box; background:rgba(255,255,255,.08); border:2px solid rgba(255,255,255,.25); border-radius:50%; backdrop-filter:blur(6px); display:flex; justify-content:center; align-items:center; }
    .joystick-stick { width:45px; height:45px; box-sizing:border-box; background:rgba(255,255,255,.3); border:2px solid rgba(255,255,255,.6); border-radius:50%; }
    .joystick-label { color:rgba(255,255,255,.5); font:700 9px system-ui,sans-serif; margin-top:6px; letter-spacing:.5px; pointer-events:none; }

    /* Habilidad colocada igual que offline: abajo a la derecha del stick de disparo. */
    .ability-button-zone { position:absolute; bottom:155px; right:50px; width:80px; height:80px; z-index:25; cursor:pointer; touch-action:none; }
    .ability-circle { width:100%; height:100%; box-sizing:border-box; padding:5px; border-radius:50%; background:var(--c); box-shadow:0 0 15px var(--c); transition:transform .1s ease; }
    .ability-circle:active { transform:scale(.92); }
    .ability-inner { width:100%; height:100%; border-radius:50%; background:radial-gradient(circle,rgba(20,20,20,.55) 0%,rgba(0,0,0,.9) 100%); display:flex; flex-direction:column; justify-content:center; align-items:center; }
    .ability-icon { font-size:22px; line-height:1; }
    .ability-text { color:#fff; font-size:10px; font-weight:bold; margin-top:2px; text-shadow:0 1px 2px #000; }
    .ability-inner small { color:#fff; font-size:9px; margin-top:2px; text-shadow:0 1px 2px #000; }
    .ability-dash { --c:#00d2ff; }
    .ability-slow { --c:#b266ff; }
    .ability-pierce { --c:#ff4d6d; }
    .state-recarga { background:conic-gradient(var(--c) var(--p),#3a3a3a 0); box-shadow:none; }
    .state-recarga .ability-icon { opacity:.4; }
    .state-armada { animation:armedPulse .5s ease-in-out infinite alternate; }
    @keyframes armedPulse { from { box-shadow:0 0 10px var(--c); transform:scale(1); } to { box-shadow:0 0 30px 8px var(--c); transform:scale(1.1); } }

    .leave-button { position:absolute; z-index:30; right:12px; top:72px; border:1px solid #ff526f; color:#fff; background:rgba(130,15,35,.8); padding:8px 12px; border-radius:9px; font:bold 11px system-ui,sans-serif; cursor:pointer; }
    .online-message { position:absolute; top:105px; left:50%; transform:translateX(-50%); z-index:30; color:#fff; background:rgba(0,0,0,.82); border:1px solid rgba(255,255,255,.24); border-radius:10px; padding:8px 12px; font:600 12px system-ui,sans-serif; text-align:center; max-width:80vw; pointer-events:none; }
    .pc-controls { position:absolute; top:68px; left:12px; max-width:min(390px,42vw); z-index:8; color:rgba(255,255,255,.82); background:rgba(0,0,0,.58); border:1px solid rgba(255,255,255,.18); border-radius:8px; padding:7px 10px; font:500 10px/1.5 system-ui,sans-serif; pointer-events:none; }
    .pc-controls strong { color:#00d2ff; margin-right:6px; }
    .round-result-overlay {position:absolute;inset:0;z-index:38;display:flex;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,.28)}
    .round-result-card {padding:14px 20px;max-width:85%;border:2px solid #00d2ff;border-radius:14px;background:rgba(5,15,30,.93);color:#fff;font:800 clamp(16px,3vw,24px)/1.3 system-ui;text-align:center}
    .result-overlay { position:absolute; inset:0; z-index:40; background:rgba(0,0,0,.82); display:flex; align-items:center; justify-content:center; padding:18px; overflow:auto; }
    .result-card { width:min(600px,96vw); max-height:90%; overflow:auto; background:#111827; border:1px solid #00d2ff; box-shadow:0 0 36px rgba(0,210,255,.15); border-radius:16px; color:#fff; padding:18px; }
    .result-card h2 { text-align:center; color:#00d2ff; margin:4px 0 12px; font-size:19px; }
    .result-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.1); }
    .result-row strong,.result-row small { display:block; } .result-row small { color:#aab4ca; font-size:11px; margin-top:4px; }
    .result-rewards { text-align:right; font-size:12px; display:flex; flex-direction:column; gap:4px; color:#ffe08a; }
    .result-card button { margin-top:16px; width:100%; border:0; border-radius:10px; background:#00b8de; color:#001018; padding:12px; font-weight:800; cursor:pointer; }
    @media (max-width:700px) { .pc-controls { display:none; } }
    @media (max-height:500px) { .fixed-joystick-zone { bottom:8px; } .joystick-base { width:82px;height:82px; } .online-hud { top:5px; } .online-ammo { bottom:9px; } .ability-button-zone { bottom:115px; right:28px; } .online-effect { top:58px; } }

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
export class OnlineGameComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly router = inject(Router);
  private readonly signalr = inject(SignalrService);
  private ctx!: CanvasRenderingContext2D;
  private gameMap!: GameMap;
  private frameId = 0;
  private subs: Subscription[] = [];
  private stateTimer: ReturnType<typeof setInterval> | null = null;
  private powerSpawnTimer: ReturnType<typeof setInterval> | null = null;
  private roundTimer: ReturnType<typeof setInterval> | null = null;
  private effectTimer: ReturnType<typeof setInterval> | null = null;
  private stateSendPending = false;
  private lastAmmoShot = 0;
  private reloadPerAmmo = 900;
  private lastEffectAt = 0;
  private abilityReadyAt = 0;
  private dashUntil = 0;
  private dashDirection = { x: 0, y: 0 };
  private perforanteArmed = false;
  private slowZone: { x: number; y: number; radius: number; endTime: number; ownerId: number } | null = null;
  private poisonTicks = new Map<number, number>();
  private powerUpImages = new Map<string, HTMLImageElement>();
  private mouseAimActive = false;
  public abilityState: 'listo' | 'armada' | 'recarga' = 'listo';
  public abilitySecondsLeft = 0;
  public abilityIcon = '💨';
  public abilityLabel = 'DASH';
  public abilityType: 'dash' | 'slow' | 'pierce' = 'dash';
  public abilityProgress = 100;
  private abilityCooldownMs = 6000;
  private keys: Record<string, boolean> = {};
  private bullets: OnlineBullet[] = [];
  private powerUps: OnlinePowerUp[] = [];
  private pendingPickups = new Set<string>();
  private players = new Map<number, OnlinePlayer>();
  private currentRoom: any = null;
  private myId = 0;
  private identityHints: string[] = [];
  private nextMessageUntil = 0;
  private stickPointer = { left: null as number | null, right: null as number | null };
  private stickOrigin = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };

  public playerTank!: Tank;
  public myPlayer: OnlinePlayer | null = null;
  public modoEquipos = false;
  public currentRound = 1;
  public totalRounds = 3;
  public roundTimeLeft = 90;
  public rondaActiva = false;
  public activeEffect: string | null = null;
  public effectSecondsLeft = 0;
  public currentAmmo = 4;
  public maxAmmo = 4;
  public ammoSlots: boolean[] = [true, true, true, true];
  public leftStick = { x: 0, y: 0, dx: 0, dy: 0 };
  public rightStick = { x: 0, y: 0, dx: 0, dy: 0 };
  public message = '';
  public partidaTerminada = false;
  public roundNotice = '';
  private roundNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRoundNoticeKey = '';
  private finalProcessed = false;
  public resultados: any[] = [];
  public get leftStickTransform(): string { return `translate(${this.leftStick.x}px, ${this.leftStick.y}px)`; }
  public get rightStickTransform(): string { return `translate(${this.rightStick.x}px, ${this.rightStick.y}px)`; }

  async ngOnInit(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = 1280;
    canvas.height = 720;

    await this.signalr.iniciarConexion();

    // Se leen los datos locales sólo como respaldo; la identidad del servidor manda.
    // El ID guardado en localStorage puede ser un ID secundario o una claim distinta.
    const cachedUserId = this.readUserId();
    this.myId = cachedUserId;
    try {
      const serverUserId = await this.signalr.obtenerMiUsuarioId();
      if (serverUserId > 0) {
        this.myId = serverUserId;
        console.info('[OnlineGame] Usuario local confirmado por SignalR:', serverUserId);
      }
    } catch (error) {
      console.warn('[OnlineGame] No se pudo confirmar el ID con el servidor; usaré el respaldo local.', error);
    }

    this.currentRoom = this.signalr.getSalaActual();
    if (!this.currentRoom) {
      this.message = 'No se encontró la sala online. Vuelve a entrar desde la sala de espera.';
      setTimeout(() => void this.router.navigateByUrl('/salas', { replaceUrl: true }), 1800);
      return;
    }

    this.initializeRoom(this.currentRoom);
    this.configureListeners();
    try {
      const items = await this.signalr.listarPowerUps();
      for (const item of items ?? []) this.upsertPowerUp(item);
    } catch (error) {
      console.warn('No se pudieron recuperar los poderes de la ronda:', error);
    }

    this.stateTimer = setInterval(() => void this.sendLocalState(), 50);
    this.powerSpawnTimer = setInterval(() => void this.spawnPowerUpIfHost(), 5000);
    this.frameId = requestAnimationFrame(this.gameLoop);

    try { await ScreenOrientation.lock({ orientation: 'landscape' }); } catch { /* web puede no admitirlo */ }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.subs.forEach(s => s.unsubscribe());
    if (this.stateTimer) clearInterval(this.stateTimer);
    if (this.powerSpawnTimer) clearInterval(this.powerSpawnTimer);
    if (this.roundTimer) clearInterval(this.roundTimer);
    if (this.effectTimer) clearInterval(this.effectTimer);
    if (this.roundNoticeTimer) clearTimeout(this.roundNoticeTimer);
    try { void ScreenOrientation.lock({ orientation: 'portrait' }); } catch { /* no-op */ }
  }

  private configureListeners(): void {
    this.subs.push(this.signalr.salaActual$.subscribe(room => {
      if (room && (room.jugadores || room.Jugadores)) this.initializeRoom(room, false);
    }));

    this.subs.push(this.signalr.estadoRemoto$.subscribe(msg => {
      if (!msg) return;
      const id = Number(msg.usuarioId ?? msg.UsuarioId);
      if (!id || id === this.myId) return;
      const player = this.players.get(id);
      if (!player) return;
      player.targetX = Number(msg.x ?? msg.X ?? player.targetX);
      player.targetY = Number(msg.y ?? msg.Y ?? player.targetY);
      player.targetAngle = Number(msg.angulo ?? msg.Angulo ?? player.targetAngle);
      player.targetTurret = Number(msg.torreta ?? msg.Torreta ?? player.targetTurret);
    }));

    this.subs.push(this.signalr.disparoRemoto$.subscribe(msg => {
      if (!msg) return;
      this.addRemoteBullet(msg);
    }));

    this.subs.push(this.signalr.zonaRemota$.subscribe(zona => {
      if (!zona) return;
      this.slowZone = {
        x: Number(zona.x ?? zona.X), y: Number(zona.y ?? zona.Y),
        radius: Number(zona.radio ?? zona.Radio ?? 170),
        endTime: Date.now() + Number(zona.ms ?? zona.Ms ?? 5000),
        ownerId: Number(zona.usuarioId ?? zona.UsuarioId)
      };
    }));

    this.subs.push(this.signalr.disparoConsumido$.subscribe(id => {
      if (!id) return;
      this.bullets = this.bullets.filter(b => b.id !== String(id));
    }));

    this.subs.push(this.signalr.jugadorSalio$.subscribe(rawId => {
      const id = Number(rawId?.usuarioId ?? rawId?.UsuarioId ?? rawId);
      if (!id || id === this.myId) return;
      this.players.delete(id);
    }));

    this.subs.push(this.signalr.rondaIniciada$.subscribe(evt => {
      if (!evt) return;
      this.currentRound = Number(evt.ronda ?? evt.Ronda ?? this.currentRound);
      this.roundNotice = '';
      this.lastRoundNoticeKey = '';
      if (this.roundNoticeTimer) clearTimeout(this.roundNoticeTimer);
      this.roundTimeLeft = Number(evt.segundos ?? evt.Segundos ?? 90);
      this.rondaActiva = true;
      this.partidaTerminada = false;
      this.activeEffect = null;
      this.effectSecondsLeft = 0;
      if (this.effectTimer) clearInterval(this.effectTimer);
      this.effectTimer = null;
      this.bullets = [];
      this.powerUps = [];
      this.pendingPickups.clear();
      this.poisonTicks.clear();
      this.slowZone = null;
      this.perforanteArmed = false;
      this.dashUntil = 0;
      this.abilityState = 'listo';
      this.abilityReadyAt = 0;
      this.abilityProgress = 100;
      this.players.forEach(p => {
        p.vidas = Number(evt.vidas ?? evt.Vidas ?? p.vidas);
        p.eliminado = false;
        p.tank.currentHp = p.tank.tankData.vida_base;
        const spawn = this.spawnPosition(p.slot);
        p.tank.x = p.targetX = spawn.x;
        p.tank.y = p.targetY = spawn.y;
      });
      if (this.roundTimer) clearInterval(this.roundTimer);
      this.roundTimer = setInterval(() => {
        if (this.roundTimeLeft > 0) this.roundTimeLeft--;
      }, 1000);
    }));

    this.subs.push(this.signalr.rondaTerminada$.subscribe(evt => {
      if (!evt) return;
      this.rondaActiva = false;
      const esFinal = Boolean(evt.esFinal ?? evt.EsFinal);
      const ronda = Number(evt.ronda ?? evt.Ronda ?? this.currentRound);
      const key = `${ronda}-${esFinal}`;
      if (this.lastRoundNoticeKey === key) return;
      this.lastRoundNoticeKey = key;
      const ganadorId = Number(evt.ganadorUsuarioId ?? evt.GanadorUsuarioId ?? 0);
      const equipoGanador = evt.equipoGanadorId ?? evt.EquipoGanadorId ?? evt.equipoGanador ?? evt.EquipoGanador;
      const ganadorNombre = evt.ganadorNombre ?? evt.GanadorNombre ?? evt.nombreGanador ?? evt.NombreGanador;
      let descripcion = 'Ronda terminada';
      if (ganadorId > 0) descripcion = ganadorId === this.myId ? '¡Ganaste la ronda!' : `Ganó ${ganadorNombre || 'otro jugador'}`;
      else if (equipoGanador !== null && equipoGanador !== undefined)
        descripcion = Number(equipoGanador) === this.myPlayer?.equipoId ? '¡Tu equipo ganó la ronda!' : 'Ganó el equipo rival';
      else if (ganadorNombre) descripcion = `Ganó ${ganadorNombre}`;
      this.roundNotice = `RONDA ${ronda}: ${descripcion}`;
      if (this.roundNoticeTimer) clearTimeout(this.roundNoticeTimer);
      this.roundNoticeTimer = setTimeout(() => this.roundNotice = '', 2600);
    }));

    this.subs.push(this.signalr.jugadorImpactado$.subscribe(evt => {
      if (!evt) return;
      const id = Number(evt.usuarioId ?? evt.UsuarioId);
      const p = this.players.get(id);
      if (!p) return;
      p.tank.currentHp = Number(evt.hpActual ?? evt.HpActual ?? p.tank.currentHp);
      p.vidas = Number(evt.vidas ?? evt.Vidas ?? p.vidas);
      if (p.vidas <= 0 && p.tank.currentHp <= 0) p.eliminado = true;
    }));

    this.subs.push(this.signalr.jugadorMurio$.subscribe(evt => {
      if (!evt) return;
      const id = Number(evt.usuarioId ?? evt.UsuarioId);
      const p = this.players.get(id);
      if (!p) return;
      p.vidas = Number(evt.vidasRestantes ?? evt.VidasRestantes ?? 0);
      p.tank.currentHp = 0;
      p.eliminado = p.vidas <= 0;
      if (id === this.myId) {
        this.activeEffect = null;
        this.showMessageFor(p.eliminado ? 'Te quedaste sin vidas en esta ronda.' : 'Tanque destruido. Reapareciendo…', 1500);
      }
    }));

    this.subs.push(this.signalr.jugadorReaparecio$.subscribe(evt => {
      if (!evt) return;
      const id = Number(evt.usuarioId ?? evt.UsuarioId);
      const p = this.players.get(id);
      if (!p) return;
      p.vidas = Number(evt.vidas ?? evt.Vidas ?? p.vidas);
      p.eliminado = false;
      p.tank.currentHp = Number(evt.hpActual ?? evt.HpActual ?? p.tank.tankData.vida_base);
      const spawn = this.spawnPosition(p.slot);
      p.tank.x = p.targetX = spawn.x;
      p.tank.y = p.targetY = spawn.y;
    }));

    this.subs.push(this.signalr.powerUpAparecio$.subscribe(item => {
      if (item) this.upsertPowerUp(item);
    }));

    this.subs.push(this.signalr.powerUpRecogido$.subscribe(evt => {
      if (!evt) return;
      const id = String(evt.id ?? evt.Id ?? '');
      this.powerUps = this.powerUps.filter(p => p.id !== id);
      this.pendingPickups.delete(id);
      const collector = Number(evt.usuarioId ?? evt.UsuarioId);
      if (collector === this.myId) {
        const tipo = String(evt.tipo ?? evt.Tipo ?? '');
        if (tipo.toLowerCase() === 'botiquin') this.showMessageFor('Botiquín: +30 HP', 1100);
        else this.applyPowerUp(tipo);
      }
    }));

    this.subs.push(this.signalr.partidaTerminada$.subscribe(evt => {
      if (!evt || this.finalProcessed) return;
      this.finalProcessed = true;
      this.rondaActiva = false;
      this.roundNotice = '';
      if (this.roundNoticeTimer) clearTimeout(this.roundNoticeTimer);
      this.partidaTerminada = true;
      this.resultados = evt.posiciones ?? evt.Posiciones ?? [];
      this.bullets = [];
      this.powerUps = [];
      this.message = '';
    }));
  }

  private initializeRoom(room: any, initial = true): void {
    // El servidor puede haber emitido RondaIniciada justo antes de que Angular termine
    // de montar este componente. En tal caso, EnPartida permite habilitar los controles.
    this.currentRoom = room;
    // EnPartida puede llegar como actualización después de montar el componente.
    // No depender de `initial`: si el evento RondaIniciada se perdió, esto habilita
    // igualmente el movimiento y evita que el canvas muestre un tanque incontrolable.
    if (Boolean(room.enPartida ?? room.EnPartida) && !this.partidaTerminada) {
      this.rondaActiva = true;
      this.currentRound = Math.max(1, Number(room.rondaActual ?? room.RondaActual ?? this.currentRound) || 1);
      if (!this.roundTimer) {
        this.roundTimer = setInterval(() => {
          if (this.rondaActiva && this.roundTimeLeft > 0) this.roundTimeLeft--;
        }, 1000);
      }
    }
    this.modoEquipos = Boolean(room.modoEquipos ?? room.ModoEquipos ?? false);
    this.totalRounds = Number(room.rondas ?? room.Rondas ?? this.totalRounds ?? 3);
    const mapId = this.normalizeMapId(room.mapaId ?? room.MapaId);
    if (!this.gameMap || this.gameMap.currentMap.id !== mapId) this.gameMap = new GameMap(mapId);

    const sourcePlayers: any[] = room.jugadores ?? room.Jugadores ?? [];
    const rosterIds = new Set<number>();
    for (const data of sourcePlayers) {
      const id = Number(data.usuarioId ?? data.UsuarioId);
      if (!id) continue;
      rosterIds.add(id);
      const old = this.players.get(id);
      if (old) {
        old.nombre = String(data.nombre ?? data.Nombre ?? old.nombre);
        old.slot = Number(data.slot ?? data.Slot ?? old.slot);
        old.equipoId = Number(data.equipoId ?? data.EquipoId ?? old.equipoId);
        old.esHost = Boolean(data.esHost ?? data.EsHost ?? old.esHost);
        old.vidas = Number(data.vidas ?? data.Vidas ?? old.vidas);
        old.tank.currentHp = Number(data.hpActual ?? data.HpActual ?? old.tank.currentHp);
        old.eliminado = old.vidas <= 0;
        continue;
      }
      const tankId = this.normalizeTankId(data.tanqueId ?? data.TanqueId);
      const tankData = TANQUES_JUEGO.find(t => t.tanque_id === tankId) ?? TANQUES_JUEGO[0];
      const slot = Number(data.slot ?? data.Slot ?? this.players.size);
      const spawn = this.spawnPosition(slot);
      const tank = new Tank(spawn.x, spawn.y, tankData as Tanque, id === this.myId);
      tank.currentHp = Number(data.hpActual ?? data.HpActual ?? tankData.vida_base);
      const p: OnlinePlayer = {
        usuarioId: id,
        nombre: String(data.nombre ?? data.Nombre ?? 'Jugador'),
        slot,
        equipoId: Number(data.equipoId ?? data.EquipoId ?? slot),
        esHost: Boolean(data.esHost ?? data.EsHost ?? false),
        tank,
        weaponId: this.normalizeWeaponId(data.armaId ?? data.ArmaId),
        targetX: spawn.x,
        targetY: spawn.y,
        targetAngle: 0,
        targetTurret: 0,
        vidas: Number(data.vidas ?? data.Vidas ?? 0),
        eliminado: false
      };
      this.players.set(id, p);
    }

    // La lista oficial de la sala es la fuente de verdad: elimina jugadores que salieron.
    for (const id of [...this.players.keys()]) {
      if (!rosterIds.has(id)) this.players.delete(id);
    }

    let me = this.players.get(this.myId);
    // Algunas versiones de inicio de sesión guardan el perfil anidado o sólo incluyen
    // el nombre en el token. Si el ID no coincide, recuperar el jugador por una identidad
    // local exacta evita dibujar el propio tanque como enemigo y bloquea menos el control.
    if (!me && this.identityHints.length) {
      const norm = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      me = [...this.players.values()].find(player =>
        this.identityHints.some(hint => norm(hint) === norm(player.nombre))
      );
      if (me) {
        this.myId = me.usuarioId;
        me.tank.isPlayer = true;
      }
    }
    if (!me) {
      this.message = 'No pude asociar tu conexión con tu tanque. Comprueba que el backend actualizado esté ejecutándose y vuelve a entrar a la sala.';
      console.warn('[OnlineGame] No se encontró el tanque local. ID guardado:', this.myId,
        'IDs recibidos:', [...this.players.keys()], 'Identidades:', this.identityHints);
      return;
    }
    this.myId = me.usuarioId;
    me.tank.isPlayer = true;
    this.myPlayer = me;
    this.playerTank = me.tank;
    this.configureAbility(me.tank.tankData.tanque_id);
    this.setWeapon(me.weaponId);
    if (initial) {
      for (const p of this.players.values()) {
        p.tank.currentHp = Number((sourcePlayers.find(x => Number(x.usuarioId ?? x.UsuarioId) === p.usuarioId)?.hpActual)
          ?? (sourcePlayers.find(x => Number(x.usuarioId ?? x.UsuarioId) === p.usuarioId)?.HpActual)
          ?? p.tank.tankData.vida_base);
      }
    }
  }

  private normalizeMapId(value: unknown): string {
    const s = String(value ?? 'mapa_1').toLowerCase();
    const match = s.match(/mapa[_ -]?(\d+)/) ?? s.match(/(\d+)/);
    const n = match?.[1] ?? '1';
    return ['1', '2', '3'].includes(n) ? `mapa_${n}` : 'mapa_1';
  }

  private normalizeTankId(value: unknown): string {
    const raw = String(value ?? '');
    // Utiliza el mismo mapeo de IDs de base de datos que el resto de la app.
    if (/^\d+$/.test(raw)) return codigoTanque(Number(raw));
    return (raw || 'TANK-01').toUpperCase();
  }

  private normalizeWeaponId(value: unknown): string {
    const raw = String(value ?? '');
    if (/^\d+$/.test(raw)) return codigoArma(Number(raw));
    return (raw || 'WEAP-02').toUpperCase();
  }

  private readUserId(): number {
    let foundId = 0;
    let foundIdScore = -1;
    const nameKeys = new Set(['nombre', 'name', 'nombreusuario', 'username', 'usuario', 'correo', 'email', 'unique_name', 'preferred_username']);
    const idKeys = new Set(['usuarioid', 'idusuario', 'userid', 'user_id', 'id', 'sub', 'nameid', 'nameidentifier']);
    const inspect = (value: any, depth = 0): void => {
      if (!value || typeof value !== 'object' || depth > 4) return;
      for (const [key, item] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if ((nameKeys.has(normalizedKey) || normalizedKey.endsWith('name') || normalizedKey.endsWith('email')) && typeof item === 'string' && item.trim()) {
          this.identityHints.push(item.trim());
        }
        if ((idKeys.has(normalizedKey) || normalizedKey.endsWith('nameidentifier')) && (typeof item === 'string' || typeof item === 'number')) {
          const candidate = Number(item);
          const score = normalizedKey.endsWith('nameidentifier') ? 5
            : ['usuarioid', 'idusuario', 'userid', 'user_id', 'sub', 'nameid'].includes(normalizedKey) ? 4
              : normalizedKey === 'id' ? 1 : 2;
          if (Number.isInteger(candidate) && candidate > 0 && score > foundIdScore) {
            foundId = candidate;
            foundIdScore = score;
          }
        }
        if (typeof item === 'string' && (normalizedKey.includes('token') || item.split('.').length === 3)) {
          const parts = item.split('.');
          if (parts.length === 3) {
            try {
              const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              inspect(JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))), depth + 1);
            } catch { /* no era un JWT descifrable */ }
          }
        }
        if (item && typeof item === 'object') inspect(item, depth + 1);
      }
    };

    try {
      const preferredKeys = ['usuario', 'user', 'sesion', 'session', 'perfil', 'auth_user'];
      for (const key of preferredKeys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try { inspect(JSON.parse(raw)); } catch { /* no es un JSON de perfil */ }
      }
      // Si el perfil no trae ID, leer las claims del JWT guardado en las claves conocidas.
      const tokenKeys = ['token', 'access_token', 'auth_token', 'jwt', 'accessToken'];
      for (const key of tokenKeys) {
        if (foundId) break;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        let token = raw;
        try {
          const parsed = JSON.parse(raw);
          token = parsed.token ?? parsed.access_token ?? parsed.accessToken ?? parsed.jwt ?? raw;
        } catch { /* token plano */ }
        const pieces = String(token).split('.');
        if (pieces.length !== 3) continue;
        try {
          const payload = pieces[1].replace(/-/g, '+').replace(/_/g, '/');
          inspect(JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))));
        } catch { /* JWT no legible */ }
      }
    } catch (error) {
      console.warn('[OnlineGame] No se pudo leer la identidad local:', error);
    }

    this.identityHints = [...new Set(this.identityHints)];
    return foundId;
  }

  private spawnPosition(slot: number): { x: number; y: number } {
    const preferred = [
      { x: 120, y: 130 }, { x: 1160, y: 130 },
      { x: 120, y: 590 }, { x: 1160, y: 590 }
    ][Math.max(0, slot) % 4];
    const rows = this.gameMap.currentMap.matrizColisiones.length;
    const cols = this.gameMap.currentMap.matrizColisiones[0].length;
    const tw = 1280 / cols, th = 720 / rows;
    const isFree = (x: number, y: number) => !this.gameMap.isWall(Math.floor(y / th), Math.floor(x / tw));
    if (isFree(preferred.x, preferred.y)) return preferred;

    const sideLeft = slot % 2 === 0;
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const x = (c + .5) * tw, y = (r + .5) * th;
        if (isFree(x, y) && ((sideLeft && x < 450) || (!sideLeft && x > 830))) return { x, y };
      }
    }
    return preferred;
  }

  private setWeapon(weaponId: string): void {
    this.maxAmmo = weaponId === 'WEAP-03' ? 2 : weaponId === 'WEAP-01' ? 3 : 4;
    this.reloadPerAmmo = weaponId === 'WEAP-03' ? 1400 : weaponId === 'WEAP-01' ? 1100 : 900;
    this.currentAmmo = this.maxAmmo;
    this.updateAmmoHud();
  }

  private updateAmmoHud(): void {
    this.ammoSlots = Array.from({ length: this.maxAmmo }, (_, i) => i < this.currentAmmo);
  }

  private async sendLocalState(): Promise<void> {
    if (!this.myPlayer || !this.rondaActiva || this.stateSendPending || this.partidaTerminada) return;
    this.stateSendPending = true;
    try {
      await this.signalr.enviarEstado({
        usuarioId: this.myId,
        x: this.playerTank.x,
        y: this.playerTank.y,
        angulo: this.playerTank.angle,
        torreta: this.playerTank.turretAngle,
        hp: this.playerTank.currentHp
      });
    } catch (error) {
      console.warn('No se pudo sincronizar el estado del tanque:', error);
    } finally {
      this.stateSendPending = false;
    }
  }

  private async spawnPowerUpIfHost(): Promise<void> {
    if (!this.myPlayer?.esHost || !this.rondaActiva || this.partidaTerminada || this.powerUps.length >= 5) return;
    const matrix = this.gameMap.currentMap.matrizColisiones;
    const empty: { r: number; c: number }[] = [];
    for (let r = 1; r < matrix.length - 1; r++) {
      for (let c = 1; c < matrix[r].length - 1; c++) {
        if (matrix[r][c] === 0) empty.push({ r, c });
      }
    }
    if (!empty.length) return;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const item: OnlinePowerUp = {
      id: this.newId(),
      x: (cell.c + .5) * (1280 / matrix[0].length),
      y: (cell.r + .5) * (720 / matrix.length),
      tipo: ['aceite', 'botiquin', 'escudo', 'falla', 'oruga', 'sobrecarga'][Math.floor(Math.random() * 6)]
    };
    try { await this.signalr.crearPowerUp(item); }
    catch (error) { console.warn('No se pudo crear el power-up compartido:', error); }
  }

  private upsertPowerUp(item: any): void {
    const normalized: OnlinePowerUp = {
      id: String(item.id ?? item.Id ?? ''),
      x: Number(item.x ?? item.X),
      y: Number(item.y ?? item.Y),
      tipo: String(item.tipo ?? item.Tipo ?? 'botiquin').toLowerCase()
    };
    if (!normalized.id || !Number.isFinite(normalized.x) || !Number.isFinite(normalized.y)) return;
    this.getPowerUpImage(normalized.tipo);
    if (!this.powerUps.some(p => p.id === normalized.id)) this.powerUps.push(normalized);
  }

  private addRemoteBullet(msg: any): void {
    const id = String(msg.balaId ?? msg.BalaId ?? '');
    if (!id || this.bullets.some(b => b.id === id)) return;
    const ownerId = Number(msg.usuarioId ?? msg.UsuarioId);
    const owner = this.players.get(ownerId);
    if (!owner || ownerId === this.myId) return;
    const x = Number(msg.x ?? msg.X), y = Number(msg.y ?? msg.Y), angle = Number(msg.angulo ?? msg.Angulo);
    const weaponId = this.normalizeWeaponId(msg.armaId ?? msg.ArmaId);
    const bullet = new Bullet(x, y, angle, weaponId, Boolean(msg.perforante ?? msg.Perforante));
    (bullet as any).__origenX = x;
    (bullet as any).__origenY = y;
    (bullet as any).__escopeta = weaponId === 'WEAP-01';
    this.bullets.push({ id, ownerId, teamId: owner.equipoId, bullet, hitRequested: false });
  }

  private fire(angle?: number): void {
    if (!this.playerTank || !this.myPlayer || !this.rondaActiva || this.myPlayer.eliminado || this.partidaTerminada) return;
    if (this.activeEffect === 'FALLA' || this.currentAmmo <= 0) return;
    const shootAngle = angle ?? this.playerTank.turretAngle;
    this.currentAmmo--;
    this.updateAmmoHud();
    this.lastAmmoShot = Date.now();

    // No permitir disparos si la partida no está activa
    if (
      !this.rondaActiva ||
      this.partidaTerminada ||
      !this.myPlayer ||
      this.myPlayer.eliminado ||
      this.myPlayer.tank.currentHp <= 0
    ) {
      return;
    }

    const x = this.playerTank.x + Math.cos(shootAngle) * 40;
    const y = this.playerTank.y + Math.sin(shootAngle) * 40;

    const offsets =
      this.myPlayer.weaponId === 'WEAP-01'
        ? [-0.2, 0, 0.2]
        : [0];

    const piercing = this.perforanteArmed;

    for (const offset of offsets) {
      const id = this.newId();
      const a = shootAngle + offset;

      const bullet = new Bullet(
        x,
        y,
        a,
        this.myPlayer.weaponId,
        piercing
      );

      (bullet as any).__origenX = x;
      (bullet as any).__origenY = y;
      (bullet as any).__escopeta = this.myPlayer.weaponId === 'WEAP-01';
      this.bullets.push({
        id,
        ownerId: this.myId,
        teamId: this.myPlayer.equipoId,
        bullet,
        hitRequested: false
      });

      void this.signalr.enviarDisparo({
        balaId: id,
        usuarioId: this.myId,
        x,
        y,
        angulo: a,
        armaId: this.myPlayer.weaponId,
        perforante: piercing
      }).catch(error => {
        // El servidor rechazó el disparo:
        // quitamos la bala local para evitar desincronización.
        this.bullets = this.bullets.filter(b => b.id !== id);

        console.warn(
          '[OnlineGame] Disparo rechazado:',
          { balaId: id, error }
        );
      });
    }

    if (piercing) this.startAbilityCooldown();
  }

  private configureAbility(tankId: string): void {
    const id = String(tankId || '').toUpperCase();
    if (id === 'TANK-02' || id.includes('JUGGERNAUT')) {
      this.abilityType = 'slow'; this.abilityIcon = '☠️'; this.abilityLabel = 'VENENO'; this.abilityCooldownMs = 12000;
    } else if (id === 'TANK-03' || id.includes('VANGUARD') || id.includes('VANGUARDIA')) {
      this.abilityType = 'pierce'; this.abilityIcon = '🎯'; this.abilityLabel = 'PERFORANTE'; this.abilityCooldownMs = 10000;
    } else {
      this.abilityType = 'dash'; this.abilityIcon = '💨'; this.abilityLabel = 'DASH'; this.abilityCooldownMs = 6000;
    }
    this.abilityProgress = 100;
  }

  onAbilityPress(event: Event): void {
    event.preventDefault();
    if (!this.myPlayer || !this.playerTank || !this.rondaActiva || this.partidaTerminada) return;
    const tankId = this.myPlayer.tank.tankData.tanque_id.toUpperCase();
    const now = Date.now();
    if (this.abilityState === 'recarga' && now < this.abilityReadyAt) return;
    if (tankId === 'TANK-03' || tankId.includes('VANGUARD')) {
      this.perforanteArmed = true;
      this.abilityState = 'armada';
      this.showMessageFor('Munición perforante preparada: tu próximo disparo atraviesa paredes y causa daño extra.', 1800);
      return;
    }
    if (tankId === 'TANK-02' || tankId.includes('JUGGERNAUT')) {
      this.slowZone = { x: this.playerTank.x, y: this.playerTank.y, radius: 170, endTime: now + 6000, ownerId: this.myId };
      void this.signalr.lanzarZona({ x: this.playerTank.x, y: this.playerTank.y, radio: 170, ms: 6000 }).catch(err => console.warn('No se pudo sincronizar la zona tóxica:', err));
      this.abilityReadyAt = now + 12000;
      this.abilityCooldownMs = 12000;
      this.abilityProgress = 0;
      this.abilityState = 'recarga';
      this.showMessageFor('Zona tóxica activada: ralentiza y envenena a los rivales cercanos.', 1800);
      return;
    }
    let dx = this.leftStick.dx, dy = this.leftStick.dy;
    if (Math.hypot(dx, dy) < .1) { dx = Math.cos(this.playerTank.angle); dy = Math.sin(this.playerTank.angle); }
    const length = Math.hypot(dx, dy) || 1;
    this.dashDirection = { x: dx / length, y: dy / length };
    this.dashUntil = now + 220;
    this.startAbilityCooldown(6000);
    this.showMessageFor('¡DASH!', 650);
  }

  private startAbilityCooldown(ms = 10000): void {
    this.abilityReadyAt = Date.now() + ms;
    this.abilityCooldownMs = ms;
    this.abilityProgress = 0;
    this.abilityState = 'recarga';
    this.perforanteArmed = false;
  }

  private updateAbilityState(): void {
    if (this.abilityState !== 'recarga') {
      this.abilityProgress = this.abilityState === 'armada' ? 100 : this.abilityProgress;
      return;
    }
    const remaining = Math.max(0, this.abilityReadyAt - Date.now());
    this.abilitySecondsLeft = Math.ceil(remaining / 1000);
    this.abilityProgress = this.abilityCooldownMs > 0
      ? Math.max(0, Math.min(100, 100 - remaining / this.abilityCooldownMs * 100))
      : 100;
    if (this.abilitySecondsLeft <= 0) {
      this.abilityState = 'listo';
      this.abilityProgress = 100;
    }
  }

  private applyPowerUp(tipo: string): void {
    this.activeEffect = tipo.toUpperCase();
    this.lastEffectAt = Date.now() + 10000;
    this.effectSecondsLeft = 10;
    if (this.effectTimer) clearInterval(this.effectTimer);
    this.effectTimer = setInterval(() => {
      this.effectSecondsLeft = Math.max(0, Math.ceil((this.lastEffectAt - Date.now()) / 1000));
      if (this.effectSecondsLeft <= 0) {
        this.activeEffect = null;
        if (this.effectTimer) clearInterval(this.effectTimer);
        this.effectTimer = null;
      }
    }, 250);
    this.showMessageFor(`Recogiste: ${tipo.toUpperCase()}`, 1100);
  }

  // Sprites más legibles sin recortar el mapa ni alterar la sincronización.
  private drawMobileTank(tank: Tank, effect: string | null, color: string): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const factor = Math.min(rect.width, rect.height) <= 650 ? 1.16 : 1;
    this.ctx.save();
    this.ctx.translate(tank.x, tank.y);
    this.ctx.scale(factor, factor);
    this.ctx.translate(-tank.x, -tank.y);
    tank.draw(this.ctx, effect, color);
    this.ctx.restore();
  }

  private gameLoop = (): void => {
    if (!this.ctx || !this.gameMap) return;
    // Renderizar siempre el mapa y los jugadores remotos aunque el ID local aún no haya coincidido.
    // Antes, exigir playerTank aquí detenía por completo el render y dejaba el canvas negro.
    this.updateAbilityState();
    this.updateGame();
    this.beginCameraFrame();
    this.gameMap.draw(this.ctx, 1280, 720);

    for (const item of this.powerUps) this.drawPowerUp(item);
    if (this.slowZone && Date.now() < this.slowZone.endTime) {
      this.ctx.save(); this.ctx.beginPath(); this.ctx.arc(this.slowZone.x, this.slowZone.y, this.slowZone.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(80,255,80,.10)'; this.ctx.fill(); this.ctx.strokeStyle = 'rgba(100,255,100,.7)'; this.ctx.lineWidth = 3; this.ctx.stroke(); this.ctx.restore();
    } else if (this.slowZone) this.slowZone = null;

    for (const p of this.players.values()) {
      const isMe = p.usuarioId === this.myId;
      if (!isMe) {
        p.tank.x += (p.targetX - p.tank.x) * 0.35;
        p.tank.y += (p.targetY - p.tank.y) * 0.35;
        p.tank.angle += (p.targetAngle - p.tank.angle) * 0.35;
        p.tank.turretAngle += (p.targetTurret - p.tank.turretAngle) * 0.35;
      }
      if (p.eliminado && p.tank.currentHp <= 0) continue;
      const color = isMe || (this.modoEquipos && p.equipoId === this.myPlayer?.equipoId) ? '#00d2ff' : '#ff2222';
      this.drawMobileTank(p.tank, isMe ? this.activeEffect : null, color);
      this.drawHealthBar(p.tank, p.tank.tankData.vida_base);
      this.ctx.save();
      this.ctx.font = '600 10px system-ui,sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = '#000000';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(p.nombre + (p.usuarioId === this.myId ? ' · TÚ' : ''), p.tank.x, p.tank.y - 54);
      this.ctx.restore();
    }

    if (this.myPlayer && this.playerTank && this.rondaActiva &&
      (this.mouseAimActive || Math.hypot(this.rightStick.dx, this.rightStick.dy) > 0.12)) {
      AimTrajectory.draw(
        this.ctx, this.playerTank.x, this.playerTank.y,
        this.playerTank.turretAngle, this.myPlayer.weaponId,
        this.gameMap, 1280, 720
      );
    }

    for (const wrapper of this.bullets) wrapper.bullet.draw(this.ctx);
    this.ctx.restore(); // restaura la transformación del mundo tras dibujar todo
    this.frameId = requestAnimationFrame(this.gameLoop);
  };

  private updateGame(): void {
    const now = Date.now();
    if (!this.myPlayer || this.partidaTerminada) return;
    const p = this.myPlayer;

    if (this.rondaActiva && !p.eliminado) {
      let dx = 0, dy = 0;
      if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) dx += 1;
      if (this.leftStick.dx !== 0 || this.leftStick.dy !== 0) {
        dx = this.leftStick.dx;
        dy = this.leftStick.dy;
      }
      let multiplier = this.activeEffect === 'ORUGA' ? .5 : this.activeEffect === 'ACEITE' ? .4 : 1;
      if (now < this.dashUntil) { dx = this.dashDirection.x; dy = this.dashDirection.y; multiplier = 3.5; }
      if (this.keys['shift']) multiplier *= 1.3;
      const magnitude = Math.hypot(dx, dy);
      if (magnitude > 1) { dx /= magnitude; dy /= magnitude; }
      const zonaVenenoActiva = this.slowZone && now < this.slowZone.endTime
        && p.usuarioId !== this.slowZone.ownerId
        && Math.hypot(p.tank.x - this.slowZone.x, p.tank.y - this.slowZone.y) <= this.slowZone.radius;
      if (zonaVenenoActiva) {
        multiplier *= 0.35;
        const owner = this.players.get(this.slowZone!.ownerId);
        const tickAnterior = this.poisonTicks.get(this.slowZone!.ownerId) ?? 0;
        const esEnemigo = !this.modoEquipos || !owner || owner.equipoId !== p.equipoId;
        if (esEnemigo && now - tickAnterior >= 950) {
          this.poisonTicks.set(this.slowZone!.ownerId, now);
          // El servidor valida que la víctima siga dentro de la zona antes de aplicar daño.
          void this.signalr.aplicarVeneno(this.slowZone!.ownerId).catch(error =>
            console.debug('Tick de veneno rechazado o fuera de zona:', error));
        }
      }
      p.tank.move(dx * multiplier, dy * multiplier, this.gameMap, 1280, 720);

      if (this.rightStick.dx !== 0 || this.rightStick.dy !== 0) {
        p.tank.turretAngle = Math.atan2(this.rightStick.dy, this.rightStick.dx);
      }

      if (this.currentAmmo < this.maxAmmo) {
        const reload = this.activeEffect === 'SOBRECARGA' ? this.reloadPerAmmo / 2 : this.reloadPerAmmo;
        const count = Math.floor((now - this.lastAmmoShot) / reload);
        if (count > 0) {
          this.currentAmmo = Math.min(this.maxAmmo, this.currentAmmo + count);
          this.lastAmmoShot += count * reload;
          this.updateAmmoHud();
        }
      }

      for (const item of this.powerUps) {
        if (this.pendingPickups.has(item.id)) continue;
        if (Math.hypot(p.tank.x - item.x, p.tank.y - item.y) < 48) {
          this.pendingPickups.add(item.id);
          void this.signalr.recogerPowerUp(item.id).then(ok => {
            if (!ok) this.pendingPickups.delete(item.id);
          }).catch(() => this.pendingPickups.delete(item.id));
        }
      }
    }

    for (const wrapper of [...this.bullets]) {
      const bullet = wrapper.bullet;
      if (!bullet.active) continue;
      bullet.update(this.gameMap, 1280, 720);
      if ((bullet as any).__escopeta &&
        Math.hypot(bullet.x - (bullet as any).__origenX,
          bullet.y - (bullet as any).__origenY) >= 260) {
        bullet.active = false;
      }
      if (!bullet.active || wrapper.ownerId === this.myId || wrapper.hitRequested) continue;

      const owner = this.players.get(wrapper.ownerId);
      const sameTeam = this.modoEquipos && owner && this.myPlayer && owner.equipoId === this.myPlayer.equipoId;
      if (sameTeam || p.eliminado) continue; // nunca se aplica daño aliado

      if (Math.hypot(bullet.x - p.tank.x, bullet.y - p.tank.y) < 35) {
        wrapper.hitRequested = true;
        bullet.active = false;
        void this.signalr.registrarImpacto(wrapper.id).then(result => {
          if (!result?.aceptado && !result?.Aceptado) return;
          const hp = Number(result.hpActual ?? result.HpActual ?? p.tank.currentHp);
          const lives = Number(result.vidas ?? result.Vidas ?? p.vidas);
          p.tank.currentHp = hp;
          p.vidas = lives;
        }).catch(error => console.warn('El servidor rechazó el impacto:', error));
      }
    }
    this.bullets = this.bullets.filter(b => b.bullet.active);
  }

  private powerUpImagePath(tipo: string): string {
    const paths: Record<string, string> = {
      botiquin: 'assets/imgs/powers/botiquin.png',
      sobrecarga: 'assets/imgs/powers/sobrecarga.png',
      escudo: 'assets/imgs/powers/escudo.png',
      aceite: 'assets/imgs/powers/aceite.png',
      oruga: 'assets/imgs/powers/oruga.png',
      falla: 'assets/imgs/powers/falla.png'
    };
    return paths[tipo.toLowerCase()] ?? 'assets/imgs/powers/botiquin.png';
  }

  private getPowerUpImage(tipo: string): HTMLImageElement {
    const key = tipo.toLowerCase();
    let image = this.powerUpImages.get(key);
    if (!image) {
      image = new Image();
      image.src = this.powerUpImagePath(key);
      this.powerUpImages.set(key, image);
    }
    return image;
  }

  private drawPowerUp(item: OnlinePowerUp): void {
    const image = this.getPowerUpImage(item.tipo);
    this.ctx.save();
    this.ctx.translate(item.x, item.y);
    this.ctx.shadowColor = '#ffaa00';
    this.ctx.shadowBlur = 18;
    const size = 58;
    if (image.complete && image.naturalWidth > 0) {
      this.ctx.drawImage(image, -size / 2, -size / 2, size, size);
    } else {
      const fallback: Record<string, string> = {
        aceite: '🛢️', botiquin: '✚', escudo: '🛡️', falla: '⚡', oruga: '⚙️', sobrecarga: '🔥'
      };
      this.ctx.fillStyle = 'rgba(255,190,0,.9)';
      this.ctx.fillRect(-19, -19, 38, 38);
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = '#fff1a8';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(-19, -19, 38, 38);
      this.ctx.font = '22px system-ui,sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#111';
      this.ctx.fillText(fallback[item.tipo.toLowerCase()] ?? '★', 0, 1);
    }
    this.ctx.restore();
  }

  private drawHealthBar(tank: Tank, maxHp: number): void {
    const w = 48, h = 5, x = tank.x - w / 2, y = tank.y - 43;
    this.ctx.fillStyle = 'rgba(0,0,0,.75)'; this.ctx.fillRect(x, y, w, h);
    const ratio = Math.max(0, Math.min(1, tank.currentHp / maxHp));
    this.ctx.fillStyle = ratio > .5 ? '#2ecc71' : ratio > .2 ? '#f1c40f' : '#ff3d5a';
    this.ctx.fillRect(x, y, w * ratio, h);
    this.ctx.strokeStyle = 'rgba(255,255,255,.8)'; this.ctx.strokeRect(x, y, w, h);
  }

  onCanvasPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.mouseAimActive = true;
    if (!this.playerTank || this.stickPointer.right !== null) return;
    const point = this.pointerToWorld(event);
    this.playerTank.turretAngle = Math.atan2(point.y - this.playerTank.y, point.x - this.playerTank.x);
  }

  onCanvasPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.mouseAimActive = true;
    if ((event.target as HTMLElement).closest('.fixed-joystick-zone,.ability-button-zone,button,.result-overlay')) return;
    event.preventDefault();
    const point = this.pointerToWorld(event);
    if (this.playerTank) this.playerTank.turretAngle = Math.atan2(point.y - this.playerTank.y, point.x - this.playerTank.x);
    this.fire();
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

  onStickPointerDown(event: PointerEvent, side: 'left' | 'right'): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.stickPointer[side] = event.pointerId;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.stickOrigin[side] = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.onStickPointerMove(event, side);
  }

  onStickPointerMove(event: PointerEvent, side: 'left' | 'right'): void {
    if (this.stickPointer[side] !== event.pointerId) return;
    const origin = this.stickOrigin[side];
    let dx = event.clientX - origin.x, dy = event.clientY - origin.y;
    const dist = Math.hypot(dx, dy), max = 42;
    if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
    const vectorX = dx / max, vectorY = dy / max;
    this[side === 'left' ? 'leftStick' : 'rightStick'].x = dx;
    this[side === 'left' ? 'leftStick' : 'rightStick'].y = dy;
    this[side === 'left' ? 'leftStick' : 'rightStick'].dx = vectorX;
    this[side === 'left' ? 'leftStick' : 'rightStick'].dy = vectorY;
    if (side === 'right' && Math.hypot(vectorX, vectorY) > .12 && this.playerTank) {
      this.playerTank.turretAngle = Math.atan2(vectorY, vectorX);
    }
  }

  onStickPointerUp(event: PointerEvent, side: 'left' | 'right'): void {
    if (this.stickPointer[side] !== event.pointerId) return;
    if (side === 'right' && this.playerTank) {
      const length = Math.hypot(this.rightStick.dx, this.rightStick.dy);
      if (length < .12) this.fireAtNearestEnemy();
      else this.fire(this.playerTank.turretAngle);
    }
    this.stickPointer[side] = null;
    const stick = side === 'left' ? this.leftStick : this.rightStick;
    stick.x = stick.y = stick.dx = stick.dy = 0;
  }

  private fireAtNearestEnemy(): void {
    if (!this.myPlayer) return;
    const enemies = [...this.players.values()].filter(p => p.usuarioId !== this.myId && !p.eliminado &&
      (!this.modoEquipos || p.equipoId !== this.myPlayer!.equipoId));
    if (!enemies.length) { this.fire(); return; }
    enemies.sort((a, b) => Math.hypot(a.tank.x - this.playerTank.x, a.tank.y - this.playerTank.y) -
      Math.hypot(b.tank.x - this.playerTank.x, b.tank.y - this.playerTank.y));
    const target = enemies[0];
    this.playerTank.turretAngle = Math.atan2(target.tank.y - this.playerTank.y, target.tank.x - this.playerTank.x);
    this.fire(this.playerTank.turretAngle);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    this.keys[key] = true;

    if (key === ' ' || key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
      event.preventDefault();
    }
    if (!event.repeat && (key === ' ' || key === 'enter')) this.fire();
    if (!event.repeat && key === 'e') this.onAbilityPress(event);
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void { this.keys[event.key.toLowerCase()] = false; }

  @HostListener('window:blur')
  handleWindowBlur(): void {
    this.keys = {};
    this.leftStick.x = this.leftStick.y = this.leftStick.dx = this.leftStick.dy = 0;
    this.rightStick.x = this.rightStick.y = this.rightStick.dx = this.rightStick.dy = 0;
    this.stickPointer.left = this.stickPointer.right = null;
  }

  async salirPartida(): Promise<void> {
    try { await this.signalr.salirSala(); } catch (e) { console.warn('No se pudo abandonar la sala:', e); }
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  async volverAlLobby(): Promise<void> {
    try { await this.signalr.salirSala(); } catch { /* La partida ya puede estar cerrada */ }
    await this.router.navigateByUrl('/salas', { replaceUrl: true });
  }

  private showMessageFor(text: string, milliseconds: number): void {
    this.message = text;
    this.nextMessageUntil = Date.now() + milliseconds;
    setTimeout(() => { if (Date.now() >= this.nextMessageUntil) this.message = ''; }, milliseconds);
  }

  private newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
