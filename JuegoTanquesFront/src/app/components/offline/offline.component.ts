import { ChangeDetectorRef, Component, OnInit, ViewRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { IonContent, IonButton, IonIcon, IonRange, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, peopleOutline, playOutline } from 'ionicons/icons';
import { TANQUES_JUEGO, ARMAS_JUEGO, Tanque, Arma } from '../../models/game-data';
import { codigoTanque, codigoArma } from '../../models/CatalogoUtil';
import { JuegoStore } from '../../services/juego-store.service';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonIcon, IonRange],
  templateUrl: './offline.component.html',
  styleUrls: ['./offline.component.scss'],
})
export class OfflineComponent implements OnInit, ViewWillEnter {
  private router = inject(Router);
  private store = inject(JuegoStore);
  private cdr = inject(ChangeDetectorRef);
  private cargaEnCurso: Promise<void> | null = null;
  config = {
    dificultad: 'normal',
    numBots: 3,
    rondas: 5,
    mapaSeleccionado: 'map1',
    tanqueSeleccionado: TANQUES_JUEGO[0]?.tanque_id ?? 'TANK-01',
    armaSeleccionada: ARMAS_JUEGO[0]?.arma_id ?? 'WEAP-01',
  };

  tanqueEquipado: Tanque = TANQUES_JUEGO[0];
  armaEquipada: Arma = ARMAS_JUEGO[0];
  cargandoPreset = false;
  mensajePreset = 'Se usará el equipamiento predeterminado.';

  constructor() {
    addIcons({
      'person-outline': personOutline,
      'people-outline': peopleOutline,
      'play-outline': playOutline,
    });
  }
  ngOnInit(): void {
    void this.cargarEquipamientoActivo();
  }
  async ionViewWillEnter(): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch {
      // En navegador web puede no estar disponible.
    }
    await this.cargarEquipamientoActivo();
  }

  /**
   * Carga el equipamiento que ya gestiona JuegoStore.
   * Primero consulta el estado equipado y, si falta alguno, recurre al preset activo.
   */
  cargarEquipamientoActivo(): Promise<void> {
    // Evita ejecutar dos cargas simultáneas al entrar por primera vez.
    if (this.cargaEnCurso) {
      return this.cargaEnCurso;
    }

    const carga = this.ejecutarCargaEquipamiento().finally(() => {
      this.cargaEnCurso = null;
    });

    this.cargaEnCurso = carga;
    return carga;
  }

  private async ejecutarCargaEquipamiento(): Promise<void> {
    this.cargandoPreset = true;
    this.mensajePreset = 'Cargando equipamiento del perfil...';

    // Si Inicio ya cargó el perfil, se pinta inmediatamente sin esperar otra petición.
    this.aplicarEquipamientoDesdeStore();
    this.actualizarVista();

    try {
      await this.store.cargarTodo();

      if (this.aplicarEquipamientoDesdeStore()) {
        this.mensajePreset =
          `Equipamiento cargado: ${this.tanqueEquipado.nombre} + ` +
          `${this.armaEquipada.nombre}`;
      } else {
        this.usarEquipoPredeterminado(
          'El perfil se cargó, pero no se pudieron resolver el tanque y el arma. Revisa la consola.'
        );
      }
    } catch (error) {
      console.error('[Offline] Falló la carga del perfil:', error);

      if (this.aplicarEquipamientoDesdeStore()) {
        this.mensajePreset =
          `Equipamiento disponible: ${this.tanqueEquipado.nombre} + ` +
          `${this.armaEquipada.nombre}`;
      } else {
        this.usarEquipoPredeterminado(
          'No se pudo recuperar el equipamiento del perfil.'
        );
      }
    } finally {
      this.cargandoPreset = false;
      // Ionic puede completar este ciclo fuera de la detección de Angular en Android.
      // Forzar el refresco evita que el equipo aparezca solamente después de tocar la pantalla.
      this.actualizarVista();
    }
  }

  /**
   * Copia el tanque y el arma del perfil a la configuración que recibirá /game.
   */
  private aplicarEquipamientoDesdeStore(): boolean {
    const preset =
      this.store.presetActivo() ??
      this.store.presets().find(p => p.esActivo) ??
      null;

    const tanqueStore = this.store.tanqueEquipado();
    const armaStore = this.store.armaEquipada();

    // Primero se intenta obtener el equipo equipado.
    // Si no se encuentra, se utiliza el preset activo.
    const tanque =
      this.resolverTanque(tanqueStore) ??
      this.resolverTanque(preset?.tanqueId);

    const arma =
      this.resolverArma(armaStore) ??
      this.resolverArma(preset?.armaId);

    if (!tanque || !arma) {
      console.warn('[Offline] No se pudo resolver todo el equipamiento.', {
        tanqueStore,
        armaStore,
        preset,
        tanqueResuelto: tanque,
        armaResuelta: arma
      });

      return false;
    }

    this.tanqueEquipado = tanque;
    this.armaEquipada = arma;

    // Estos identificadores los utiliza la configuración que recibe /game.
    this.config.tanqueSeleccionado = tanque.tanque_id;
    this.config.armaSeleccionada = arma.arma_id;

    return true;
  }

  private resolverTanque(value: any): Tanque | undefined {
    const rawValue =
      value && typeof value === 'object'
        ? value.tanque_id ??
        value.tanqueId ??
        value.TanqueId ??
        value.tankId ??
        value.id ??
        value.Id ??
        value.nombre ??
        value.Nombre
        : value;

    if (rawValue === undefined || rawValue === null) {
      return undefined;
    }

    const raw = String(rawValue).trim();
    const upper = raw.toUpperCase();

    // Coincidencia por código o nombre.
    const exact = TANQUES_JUEGO.find(
      t =>
        t.tanque_id.toUpperCase() === upper ||
        t.nombre.toUpperCase() === upper
    );

    if (exact) {
      return exact;
    }

    // Conversión de identificadores del catálogo.
    const code = codigoTanque(rawValue as any);
    const converted = TANQUES_JUEGO.find(
      t => t.tanque_id.toUpperCase() === String(code ?? '').toUpperCase()
    );

    if (converted) {
      return converted;
    }

    // Último intento: identificador numérico basado en la posición.
    const n = Number(raw.replace(/[^0-9]/g, ''));

    if (Number.isInteger(n) && n >= 1 && n <= TANQUES_JUEGO.length) {
      return TANQUES_JUEGO[n - 1];
    }

    return undefined;
  }

  private resolverArma(value: any): Arma | undefined {
    const rawValue =
      value && typeof value === 'object'
        ? value.arma_id ??
        value.armaId ??
        value.ArmaId ??
        value.weaponId ??
        value.id ??
        value.Id ??
        value.nombre ??
        value.Nombre
        : value;

    if (rawValue === undefined || rawValue === null) {
      return undefined;
    }

    const raw = String(rawValue).trim();
    const upper = raw.toUpperCase();

    const exact = ARMAS_JUEGO.find(
      a =>
        a.arma_id.toUpperCase() === upper ||
        a.nombre.toUpperCase() === upper
    );

    if (exact) {
      return exact;
    }

    const code = codigoArma(rawValue as any);
    const converted = ARMAS_JUEGO.find(
      a => a.arma_id.toUpperCase() === String(code ?? '').toUpperCase()
    );

    if (converted) {
      return converted;
    }

    const n = Number(raw.replace(/[^0-9]/g, ''));

    if (Number.isInteger(n) && n >= 1 && n <= ARMAS_JUEGO.length) {
      return ARMAS_JUEGO[n - 1];
    }

    return undefined;
  }

  private usarEquipoPredeterminado(motivo: string): void {
    this.tanqueEquipado = TANQUES_JUEGO[0];
    this.armaEquipada = ARMAS_JUEGO[0];
    this.config.tanqueSeleccionado = TANQUES_JUEGO[0].tanque_id;
    this.config.armaSeleccionada = ARMAS_JUEGO[0].arma_id;
    this.mensajePreset = motivo;
  }

  private actualizarVista(): void {
    if (!(this.cdr as ViewRef).destroyed) this.cdr.detectChanges();
  }

  iniciarPartidaOffline(): void {
    const botsConfigurados = [];
    for (let i = 0; i < this.config.numBots; i++) {
      const tanqueAleatorio = TANQUES_JUEGO[Math.floor(Math.random() * TANQUES_JUEGO.length)];
      const armaAleatoria = ARMAS_JUEGO[Math.floor(Math.random() * ARMAS_JUEGO.length)];
      botsConfigurados.push({
        idBot: i + 1,
        tanque: tanqueAleatorio,
        arma: armaAleatoria,
        dificultad: this.config.dificultad,
      });
    }

    // Pasa el equipamiento y la configuración completa por el state del router
    this.router.navigate(['/game'], {
      state: {
        config: { ...this.config },
        equipamientoJugador: {
          tanque: this.tanqueEquipado,
          arma: this.armaEquipada
        },
        bots: botsConfigurados,
      },
    });
  }
}
