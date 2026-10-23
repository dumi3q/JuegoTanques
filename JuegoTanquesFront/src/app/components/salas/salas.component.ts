import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

interface Sala {
  id: number;
  codigo?: string;
  nombre: string;
  mapa: string;
  jugadoresActuales: number;
  jugadoresMaximos: number;
  esPrivada: boolean;
  modoEquipos: boolean;
  rondas: number;
}

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
export class SalasComponent {

  isModalOpen = false;
  codigoIngresado: string = '';

  // Incluimos la opción de Aleatorio + los 3 mapas oficiales
  mapas: MapaJuego[] = [
    {
      id: 'aleatorio',
      nombre: '🎲 Mapa Aleatorio',
      estilo: 'Selección al azar al iniciar la partida',
      imagen: 'assets/imgs/mapa_aleatorio.jpg', // O una imagen por defecto
      filas: 16,
      columnas: 32,
      matrizColisiones: []
    },
    ...MAPAS_JUEGO
  ];

  indiceMapaActual: number = 0;

  nuevaSala = {
    nombre: 'Batalla táctica',
    mapa: this.mapas[0].nombre,
    rondas: 3,
    vidas: 3,
    jugadoresMax: 4,
    esPrivada: false,
    codigoPrivado: '',
    modoEquipos: true
  };

  salas: Sala[] = [
    { id: 1, nombre: 'Comando Alfa - Pro', mapa: 'Ciudad en Ruinas', jugadoresActuales: 3, jugadoresMaximos: 4, esPrivada: false, modoEquipos: true, rondas: 3 },
    { id: 2, codigo: 'TANK-9182', nombre: 'Duelo de Honor', mapa: 'Complejo Industrial', jugadoresActuales: 1, jugadoresMaximos: 2, esPrivada: true, modoEquipos: false, rondas: 5 },
    { id: 3, nombre: 'Guerra de Acero', mapa: 'Pueblo Fronterizo', jugadoresActuales: 2, jugadoresMaximos: 4, esPrivada: false, modoEquipos: true, rondas: 3 }
  ];

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

  get mapaSeleccionado(): MapaJuego {
    return this.mapas[this.indiceMapaActual];
  }

  siguienteMapa() {
    if (this.indiceMapaActual < this.mapas.length - 1) {
      this.indiceMapaActual++;
    } else {
      this.indiceMapaActual = 0;
    }
    this.nuevaSala.mapa = this.mapaSeleccionado.nombre;
  }

  anteriorMapa() {
    if (this.indiceMapaActual > 0) {
      this.indiceMapaActual--;
    } else {
      this.indiceMapaActual = this.mapas.length - 1;
    }
    this.nuevaSala.mapa = this.mapaSeleccionado.nombre;
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
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  crearSala() {
    const nueva: Sala = {
      id: this.salas.length + 1,
      nombre: this.nuevaSala.nombre,
      mapa: this.mapaSeleccionado.nombre,
      jugadoresActuales: 1,
      jugadoresMaximos: Number(this.nuevaSala.jugadoresMax),
      esPrivada: this.nuevaSala.esPrivada,
      codigo: this.nuevaSala.codigoPrivado,
      modoEquipos: this.nuevaSala.modoEquipos,
      rondas: Number(this.nuevaSala.rondas)
    };

    this.salas.unshift(nueva);
    this.isModalOpen = false;
  }

  unirsePorCodigo() {
    if (!this.codigoIngresado) return;
    console.log('Uniéndose con código:', this.codigoIngresado);
  }

  unirseSala(sala: Sala) {
    console.log('Uniéndose a:', sala.nombre);
  }
}
