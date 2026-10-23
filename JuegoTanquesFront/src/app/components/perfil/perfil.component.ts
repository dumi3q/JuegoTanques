import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, IonButton, IonBadge,
  IonSegment, IonSegmentButton, IonLabel, IonCard
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline, shieldOutline, hardwareChipOutline,
  ribbonOutline, constructOutline, bookmarkOutline
} from 'ionicons/icons';

interface Preset {
  id: number;
  nombre: string;
  tanque: string;
  arma: string;
  equipamiento: string;
}

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
export class PerfilComponent {

  // Datos del Jugador
  jugador = {
    nombre: 'Comandante_Alpha',
    nivel: 24,
    avatar: 'assets/imgs/avatars/user1.png',
    monedas: 1450,
    tanqueEquipado: 'M4 Sherman (Mediano)',
    armaEquipada: 'Cañón de 75mm M3',
    equipamientoActivo: 'Blindaje Adicional + Orugas Reforzadas'
  };

  // Pestaña activa ('general', 'inventario', 'presets')
  pestanaActiva: string = 'general';

  // Inventario disponible
  inventarioTanques = [
    { nombre: 'M4 Sherman', tipo: 'Mediano', estado: 'Equipado', img: 'assets/imgs/tanques/sherman.png' },
    { nombre: 'T-34/85', tipo: 'Mediano', estado: 'En Garage', img: 'assets/imgs/tanques/t34.png' },
    { nombre: 'Tiger I', tipo: 'Pesado', estado: 'En Garage', img: 'assets/imgs/tanques/tiger.png' }
  ];

  inventarioArmas = [
    { nombre: 'Cañón de 75mm M3', tipo: 'Principal', estado: 'Equipado' },
    { nombre: 'Obús de 105mm', tipo: 'Artillería', estado: 'Disponible' },
    { nombre: 'Ametralladora Calibre .50', tipo: 'Secundaria', estado: 'Disponible' }
  ];

  // Presets de Combate
  presets: Preset[] = [
    { id: 1, nombre: 'Preset Asalto Rápido', tanque: 'M4 Sherman', arma: 'Cañón de 75mm M3', equipamiento: 'Orugas Rápidas' },
    { id: 2, nombre: 'Preset Defensivo Pesado', tanque: 'Tiger I', arma: 'KwK 36 L/56', equipamiento: 'Blindaje Extra' }
  ];

  constructor() {
    addIcons({
      'person-outline': personOutline,
      'shield-outline': shieldOutline,
      'hardware-chip-outline': hardwareChipOutline,
      'ribbon-outline': ribbonOutline,
      'construct-outline': constructOutline,
      'bookmark-outline': bookmarkOutline
    });
  }

  get rangoActual(): string {
    if (this.nivel >= 40) return 'General de División 🎖️';
    if (this.nivel >= 30) return 'Coronel del Frente 🛡️';
    if (this.nivel >= 20) return 'Capitán Veterano ⭐';
    if (this.nivel >= 10) return 'Teniente de Blindados ⚔️';
    return 'Recluta Novato 🪖';
  }

  get nivel(): number {
    return this.jugador.nivel;
  }

  cambiarPestana(event: any) {
    this.pestanaActiva = event.detail.value;
  }

  guardarPresetActual() {
    console.log('Guardando configuración actual como nuevo preset...');
  }
}
