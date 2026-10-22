import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// 1. Importa los componentes de Ionic desde el paquete principal (sin el /standalone)
import {
  IonApp, IonButtons, IonContent, IonHeader, IonMenu,
  IonMenuButton, IonTitle, IonToolbar, IonList, IonItem,
  IonIcon, IonLabel, IonCard, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol
} from '@ionic/angular';

// 2. Importa los iconos de Ionicons
import { addIcons } from 'ionicons';
import {
  homeOutline,
  peopleOutline,
  gameControllerOutline,
  cartOutline,
  personOutline,
  trophyOutline,
  settingsOutline,
  logOutOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonApp, IonButtons, IonContent, IonHeader, IonMenu,
    IonMenuButton, IonTitle, IonToolbar, IonList, IonItem,
    IonIcon, IonLabel, IonCard, IonCardHeader, IonCardSubtitle,
    IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol
  ]
})
export class InicioComponent {
  private router = inject(Router);

  seccionActual: string = 'inicio';
  tituloSeccionActual: string = 'Inicio / Dashboard';

  constructor() {
    // 3. Registramos los iconos al cargar el componente
    addIcons({
      'home-outline': homeOutline,
      'people-outline': peopleOutline,
      'game-controller-outline': gameControllerOutline,
      'cart-outline': cartOutline,
      'person-outline': personOutline,
      'trophy-outline': trophyOutline,
      'settings-outline': settingsOutline,
      'log-out-outline': logOutOutline
    });
  }

  cambiarSeccion(seccion: string) {
    this.seccionActual = seccion;
    switch (seccion) {
      case 'inicio': this.tituloSeccionActual = 'Inicio / Dashboard'; break;
      case 'salas': this.tituloSeccionActual = 'Salas de Juego'; break;
      case 'juego': this.tituloSeccionActual = 'Batalla Online'; break;
      case 'tienda': this.tituloSeccionActual = 'Tienda del Juego'; break;
      case 'perfil': this.tituloSeccionActual = 'Mi Perfil'; break;
      case 'ranking': this.tituloSeccionActual = 'Ranking Global'; break;
      case 'configuracion': this.tituloSeccionActual = 'Configuración'; break;
      default: this.tituloSeccionActual = 'Menú Principal';
    }
  }

  cerrarSesion() {
    this.router.navigate(['/login']);
  }
}
