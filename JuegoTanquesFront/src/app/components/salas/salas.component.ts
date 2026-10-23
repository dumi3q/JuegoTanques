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

interface Mapa {
  id: string;
  nombre: string;
  imagen: string;
}

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

  // Lista de Mapas disponibles para el carrusel
  mapas: Mapa[] = [
    { id: 'aleatorio', nombre: '🎲 Mapa Aleatorio', imagen: 'assets/imgs/mapa_aleatorio.jpg' },
    { id: 'desierto', nombre: 'Desierto Oxidado', imagen: 'assets/imgs/header.jpg' },
    { id: 'canon', nombre: 'Cañón Industrial', imagen: 'assets/imgs/settings.jpg' },
    { id: 'ruinas', nombre: 'Ruinas del Hangar', imagen: 'assets/imgs/hangar.jpg' }
  ];

  indiceMapaActual: number = 0;

  // Parámetros para crear una nueva sala
  nuevaSala = {
    nombre: 'Batalla del Desierto',
    mapa: 'Desierto Oxidado',
    rondas: 3,
    vidas: 3,
    jugadoresMax: 4,
    esPrivada: false,
    codigoPrivado: '',
    modoEquipos: true
  };

  // Salas activas
  salas: Sala[] = [
    { id: 1, nombre: 'Comando Alfa - Pro', mapa: 'Desierto Oxidado', jugadoresActuales: 3, jugadoresMaximos: 4, esPrivada: false, modoEquipos: true, rondas: 3 },
    { id: 2, codigo: 'TANK-9182', nombre: 'Duelo de Honor', mapa: 'Cañón Industrial', jugadoresActuales: 1, jugadoresMaximos: 2, esPrivada: true, modoEquipos: false, rondas: 5 },
    { id: 3, nombre: 'Guerra de Acero', mapa: 'Ruinas del Hangar', jugadoresActuales: 2, jugadoresMaximos: 4, esPrivada: false, modoEquipos: true, rondas: 3 }
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

  get mapaSeleccionado(): Mapa {
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
      // Genera un código aleatorio táctico
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
    console.log('Sala Creada:', nueva);
  }

  unirsePorCodigo() {
    if (!this.codigoIngresado) return;
    console.log('Buscando y uniéndose a sala con código:', this.codigoIngresado);
  }

  unirseSala(sala: Sala) {
    console.log('Uniéndose a la sala:', sala.nombre);
  }
}
