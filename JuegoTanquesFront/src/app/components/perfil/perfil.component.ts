import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import {
  IonContent, IonIcon, IonButton, IonBadge,
  IonSegment, IonSegmentButton, IonLabel, IonCard,
  ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline, shieldOutline, hardwareChipOutline,
  ribbonOutline, constructOutline, bookmarkOutline, cameraOutline
} from 'ionicons/icons';
import { JuegoStore } from '../../services/juego-store.service';
import { IPreset } from '../../models/IJuego';
import { Arma, Tanque } from '../../models/game-data';
import { codigoArma, codigoTanque, idDeCodigo } from '../../models/CatalogoUtil';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonButton,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
})
export class PerfilComponent implements OnInit, ViewWillEnter {
  readonly store = inject(JuegoStore);

  pestanaActiva: string = 'general';

  readonly mensaje = signal('');
  readonly ocupado = signal(false);

  readonly tanquesPoseidos = computed(() => {
    const ids = this.store.inventario().tanqueIds;
    return this.store.tanques().filter(t => ids.includes(idDeCodigo(t.tanque_id)));
  });

  readonly armasPoseidas = computed(() => {
    const ids = this.store.inventario().armaIds;
    return this.store.armas().filter(a => ids.includes(idDeCodigo(a.arma_id)));
  });

  readonly nivel = computed(() => this.store.resumen()?.nivel ?? 1);

  readonly rangoActual = computed(() => {
    const n = this.nivel();
    if (n >= 40) return 'General de División 🎖️';
    if (n >= 30) return 'Coronel del Frente 🛡️';
    if (n >= 20) return 'Capitán Veterano ⭐';
    if (n >= 10) return 'Teniente de Blindados ⚔️';
    return 'Recluta Novato 🪖';
  });

  constructor() {
    addIcons({
      'person-outline': personOutline,
      'shield-outline': shieldOutline,
      'hardware-chip-outline': hardwareChipOutline,
      'ribbon-outline': ribbonOutline,
      'construct-outline': constructOutline,
      'bookmark-outline': bookmarkOutline,
      'camera-outline': cameraOutline
    });
  }

  ngOnInit(): void {
    if (!this.store.resumen()) void this.store.cargarTodo();
  }

  async ionViewWillEnter(): Promise<void> {
    void this.store.cargarTodo();
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  cambiarPestana(event: any) {
    this.pestanaActiva = event.detail.value;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Image = reader.result as string;

        void this.ejecutar(async () => {
          await this.store.actualizarFotoPerfil(base64Image);
          this.mensaje.set('¡Foto de perfil actualizada con éxito!');
        });
      };
      reader.readAsDataURL(file);
    }
  }

  nombreTanque(id: number): string {
    return this.store.tanques().find(t => t.tanque_id === codigoTanque(id))?.nombre ?? `Tanque ${id}`;
  }

  nombreArma(id: number): string {
    return this.store.armas().find(a => a.arma_id === codigoArma(id))?.nombre ?? `Arma ${id}`;
  }

  esTanqueEquipado(t: Tanque): boolean {
    return this.store.tanqueEquipado()?.tanque_id === t.tanque_id;
  }

  esArmaEquipada(a: Arma): boolean {
    return this.store.armaEquipada()?.arma_id === a.arma_id;
  }

  equiparTanque(t: Tanque) {
    void this.ejecutar(async () => {
      await this.store.equipar({ tanqueId: idDeCodigo(t.tanque_id) });
      this.mensaje.set(`${t.nombre} equipado.`);
    });
  }

  equiparArma(a: Arma) {
    void this.ejecutar(async () => {
      await this.store.equipar({ armaId: idDeCodigo(a.arma_id) });
      this.mensaje.set(`${a.nombre} equipada.`);
    });
  }

  cargarPreset(p: IPreset) {
    void this.ejecutar(async () => {
      await this.store.activarPreset(p.presetId);
      this.mensaje.set(`Preset "${p.nombre}" cargado.`);
    });
  }

  guardarPresetActual() {
    const activo = this.store.presetActivo();
    if (!activo) {
      this.mensaje.set('Todavía no tienes un equipo activo.');
      return;
    }

    const usados = this.store.presets().map(p => p.numeroSlot);
    const libre = [1, 2, 3].find(slot => !usados.includes(slot));
    if (!libre) {
      this.mensaje.set('Ya usaste los 3 espacios de presets.');
      return;
    }

    void this.ejecutar(async () => {
      await this.store.guardarPreset({
        numeroSlot: libre,
        nombre: `Preset ${libre}`,
        tanqueId: activo.tanqueId,
        armaId: activo.armaId,
      });
      this.mensaje.set(`Equipo guardado como Preset ${libre}.`);
    });
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.mensaje.set('');
    try {
      await accion();
    } catch (e) {
      this.mensaje.set(this.store.mensajeDe(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
