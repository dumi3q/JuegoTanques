import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonButton, IonIcon, IonBadge, IonProgressBar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

interface Tanque {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  imagen: string;
  blindaje: number; // 0 a 100
  danio: number;     // 0 a 100
  velocidad: number; // 0 a 100
  desbloqueado: boolean;
}

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonProgressBar
  ],
  templateUrl: './tienda.component.html',
  styleUrls: ['./tienda.component.scss'],
})
export class TiendaComponent {

  constructor() {
    // Registra los iconos explicitamente para los botones del carrusel
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline
    });
  }

  tanques: Tanque[] = [
    {
      id: 1,
      nombre: 'M4 Sherman',
      categoria: 'Tanque Mediano',
      precio: 500,
      imagen: 'assets/imgs/tanques/sherman.png',
      blindaje: 60,
      danio: 55,
      velocidad: 65,
      desbloqueado: true
    },
    {
      id: 2,
      nombre: 'T-34/85',
      categoria: 'Tanque Mediano',
      precio: 800,
      imagen: 'assets/imgs/tanques/t34.png',
      blindaje: 70,
      danio: 75,
      velocidad: 70,
      desbloqueado: false
    },
    {
      id: 3,
      nombre: 'Tiger I',
      categoria: 'Tanque Pesado',
      precio: 1500,
      imagen: 'assets/imgs/tanques/tiger.png',
      blindaje: 95,
      danio: 90,
      velocidad: 45,
      desbloqueado: false
    }
  ];

  indiceActual: number = 0;

  get tanqueActual(): Tanque {
    return this.tanques[this.indiceActual];
  }

  siguiente() {
    if (this.indiceActual < this.tanques.length - 1) {
      this.indiceActual++;
    } else {
      this.indiceActual = 0; // Bucle al inicio
    }
  }

  anterior() {
    if (this.indiceActual > 0) {
      this.indiceActual--;
    } else {
      this.indiceActual = this.tanques.length - 1; // Bucle al final
    }
  }

  comprarOEquipar(tanque: Tanque) {
    if (tanque.desbloqueado) {
      console.log('Equipando tanque:', tanque.nombre);
    } else {
      console.log('Comprando tanque:', tanque.nombre);
    }
  }
}
