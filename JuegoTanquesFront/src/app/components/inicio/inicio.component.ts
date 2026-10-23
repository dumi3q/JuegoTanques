import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PerfilComponent } from '../perfil/perfil.component';
import { SettingsComponent } from '../settings/settings.component';
import { RankingComponent } from '../ranking/ranking.component';
import { TiendaComponent } from '../tienda/tienda.component';
import { SalasComponent } from '../salas/salas.component';
import { OfflineComponent } from '../offline/offline.component';
// 1. Importa los componentes de Ionic desde el paquete principal (sin el /standalone)
import {
  IonApp, IonButtons, IonContent, IonHeader, IonMenu,
  IonMenuButton, IonTitle, IonToolbar, IonList, IonItem,
  IonIcon, IonLabel, IonCard, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol
} from '@ionic/angular';


import { addIcons } from 'ionicons';
import {
  homeOutline,
  peopleOutline,
  gameControllerOutline,
  cartOutline,
  personOutline,
  trophyOutline,
  settingsOutline,
  logOutOutline,
  hardwareChipOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonApp, IonButtons, OfflineComponent,SalasComponent, RankingComponent, IonContent, IonHeader, IonMenu,
    IonMenuButton, IonTitle, IonToolbar, IonList, IonItem,
    IonIcon, IonLabel, IonCard, IonCardHeader, IonCardSubtitle,
    IonCardTitle, IonCardContent, PerfilComponent,SettingsComponent,IonGrid, IonRow, IonCol, TiendaComponent
  ],
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
      'log-out-outline': logOutOutline,
      'hardware-chip-outline': hardwareChipOutline
    });
  }

  cambiarSeccion(seccion: string) {
    this.seccionActual = seccion;
    switch (seccion) {
      case 'inicio': this.tituloSeccionActual = 'Inicio / Dashboard'; break;
      case 'salas': this.tituloSeccionActual = 'Salas de Juego'; break;
      case 'juego': this.tituloSeccionActual = ' Partida Offline'; break;
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
