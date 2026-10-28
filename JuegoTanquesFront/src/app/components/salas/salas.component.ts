import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonContent, IonButton, IonIcon, IonBadge,
  IonModal, IonItem, IonLabel, IonSelect, IonSelectOption,
  IonRange, IonToggle, IonInput
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline, addCircleOutline, lockClosedOutline,
  globeOutline, playOutline, closeOutline, keyOutline,
  chevronBackOutline, chevronForwardOutline, shuffleOutline
} from 'ionicons/icons';
import { MAPAS_JUEGO, MapaJuego } from '../../models/game-data';
import { SignalrService } from '../../services/signalr';

@Component({
  selector: 'app-salas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonModal,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonRange,
    IonToggle,
    IonInput
  ],
  templateUrl: './salas.component.html',
  styleUrls: ['./salas.component.scss'],
})
export class SalasComponent implements ViewWillEnter, OnInit, OnDestroy {
  isModalOpen = false;
  codigoIngresado: string = '';
  salas: any[] = [];
  private subSalas?: Subscription;

  private signalrService = inject(SignalrService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  mapas: (MapaJuego & { imagen?: string })[] = [
    {
      id: 'aleatorio',
      nombre: '🎲 Mapa Aleatorio',
      tipo: 'Aleatorio',
      descripcion: 'Selección al azar al iniciar la partida',
      matrizColisiones: [],
      imagen: 'assets/imgs/mapas/map1.png'
    },
    ...MAPAS_JUEGO.map(m => {
      let archivoImg = 'map1.png';
      if (m.id === 'mapa_2') archivoImg = 'map2.png';
      if (m.id === 'mapa_3') archivoImg = 'map3.png';

      return {
        ...m,
        imagen: `assets/imgs/mapas/${archivoImg}`
      };
    })
  ];

  indiceMapaActual: number = 0;

  nuevaSala = {
    nombre: 'Batalla táctica',
    rondas: 3,
    vidas: 3,
    jugadoresMax: 4,
    esPrivada: false,
    codigoPrivado: '',
    modoEquipos: true
  };

  constructor() {
    addIcons({
      'people-outline': peopleOutline,
      'add-circle-outline': addCircleOutline,
      'lock-closed-outline': lockClosedOutline,
      'globe-outline': globeOutline,
      'play-outline': playOutline,
      'close-outline': closeOutline,
      'key-outline': keyOutline,
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'shuffle-outline': shuffleOutline
    });
  }

  async ngOnInit() {
    await this.signalrService.iniciarConexion();

    this.subSalas = this.signalrService.listaSalas$.subscribe((lista) => {
      if (lista) {
        this.salas = lista;
        this.cdr.detectChanges();
      }
    });

    await this.cargarSalasDisponibles();
  }

  ngOnDestroy() {
    this.subSalas?.unsubscribe();
  }

  async ionViewWillEnter(): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
    await this.cargarSalasDisponibles();
  }

  async cargarSalasDisponibles() {
    try {
      const lista = await this.signalrService.listarSalas();
      if (lista) {
        this.salas = lista;
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error('Error al listar salas:', err);
    }
  }

  get mapaSeleccionado() {
    return this.mapas[this.indiceMapaActual];
  }

  siguienteMapa() {
    if (this.indiceMapaActual < this.mapas.length - 1) {
      this.indiceMapaActual++;
    } else {
      this.indiceMapaActual = 0;
    }
  }

  anteriorMapa() {
    if (this.indiceMapaActual > 0) {
      this.indiceMapaActual--;
    } else {
      this.indiceMapaActual = this.mapas.length - 1;
    }
  }

  togglePrivada() {
    if (this.nuevaSala.esPrivada) {
      const numero = Math.floor(1000 + Math.random() * 9000);
      this.nuevaSala.codigoPrivado = `TANK-${numero}`;
    } else {
      this.nuevaSala.codigoPrivado = '';
    }
  }

  abrirModalCrear() {
    this.togglePrivada();
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  async crearSala() {
    try {
      const datosCreacion = {
        nombre: this.nuevaSala.nombre,
        mapaId: this.mapaSeleccionado.id,
        rondas: Number(this.nuevaSala.rondas),
        vidas: Number(this.nuevaSala.vidas),
        jugadoresMaximos: Number(this.nuevaSala.jugadoresMax),
        privada: this.nuevaSala.esPrivada,
        codigoPersonalizado: this.nuevaSala.esPrivada ? this.nuevaSala.codigoPrivado : null,
        // null permite al backend seleccionar el preset activo del usuario.
        presetId: null,
        modoEquipos: Boolean(this.nuevaSala.modoEquipos)
      };

      const respuesta = await this.signalrService.crearSala(datosCreacion);

      if (respuesta?.error) {
        alert(respuesta.error);
        return;
      }

      if (!respuesta?.sala) {
        alert('El servidor no confirmó la creación de la sala.');
        return;
      }

      this.isModalOpen = false;
      void this.router.navigate(['/sala-espera']);
    } catch (err) {
      console.error('Error al desplegar la sala:', err);
      alert('No se pudo crear la sala.');
    }
  }

  async unirsePorCodigo() {
    if (!this.codigoIngresado || !this.codigoIngresado.trim()) {
      alert('Por favor, ingresa un código de sala válido.');
      return;
    }

    const codigoLimpio = this.codigoIngresado.trim().toUpperCase();
    try {
      const respuesta = await this.signalrService.unirseSala(codigoLimpio);
      console.log('Unido a sala por código:', respuesta);

      // 🟢 CAMBIO 3: Validación estricta de la respuesta antes de navegar
      if (respuesta?.error) {
        alert(respuesta.error);
        return;
      }

      if (!respuesta?.sala) {
        alert('El servidor no confirmó la unión a la sala.');
        return;
      }

      void this.router.navigate(['/sala-espera']);
    } catch (err) {
      console.error('Error al unirse por código:', err);
      alert('Código de sala inválido o sala llena.');
    }
  }

  async unirseSala(codigoSala: string) {
    try {
      if (!codigoSala) {
        alert('La sala seleccionada no tiene un código válido.');
        return;
      }

      const codigoLimpio = codigoSala.trim().toUpperCase();
      console.log('Uniendo a sala mediante tarjeta:', codigoLimpio);

      const respuesta = await this.signalrService.unirseSala(codigoLimpio);
      console.log('Respuesta de unión:', respuesta);

      // 🟢 CAMBIO 4: Validación estricta de la respuesta antes de navegar
      if (respuesta?.error) {
        alert(respuesta.error);
        return;
      }

      if (!respuesta?.sala) {
        alert('El servidor no confirmó la unión a la sala.');
        return;
      }

      void this.router.navigate(['/sala-espera']);
    } catch (err) {
      console.error('Error al unirse a la sala:', err);
      alert('No se pudo unir a la sala seleccionada.');
    }
  }
}
