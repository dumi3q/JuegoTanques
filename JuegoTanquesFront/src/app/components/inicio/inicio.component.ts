import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ViewWillEnter } from '@ionic/angular';
import { PerfilComponent } from '../perfil/perfil.component';
import { SettingsComponent } from '../settings/settings.component';
import { RankingComponent } from '../ranking/ranking.component';
import { TiendaComponent } from '../tienda/tienda.component';
import { SalasComponent } from '../salas/salas.component';
import { OfflineComponent } from '../offline/offline.component';
import {
  IonApp, IonButtons, IonContent, IonHeader, IonMenu,
  IonMenuButton, IonTitle, IonToolbar, IonList, IonItem,
  IonIcon, IonLabel, IonCard, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol,
  IonProgressBar, IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline, peopleOutline, gameControllerOutline,
  cartOutline, personOutline, trophyOutline,
  settingsOutline, logOutOutline, hardwareChipOutline
} from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { JuegoStore } from '../../services/juego-store.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonApp, IonButtons, OfflineComponent, SalasComponent, RankingComponent, IonContent, IonHeader, IonMenu,
    IonMenuButton, IonTitle, IonToolbar, IonList, IonItem,
    IonIcon, IonLabel, IonCard, IonCardHeader, IonCardSubtitle,
    IonCardTitle, IonCardContent, PerfilComponent, SettingsComponent, IonGrid, IonRow, IonCol, TiendaComponent,
    IonProgressBar, IonButton
  ],
})
export class InicioComponent implements OnInit, ViewWillEnter {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly store = inject(JuegoStore);

  readonly urlServidor = environment.baseUrl;

  seccionActual: string = 'inicio';
  tituloSeccionActual: string = 'Inicio / Dashboard';

  constructor() {
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

  ngOnInit(): void {
    void this.store.cargarTodo();
  }

  async ionViewWillEnter(): Promise<void> {
    void this.store.cargarTodo();
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  reintentar(): void {
    void this.store.cargarTodo();
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
    this.auth.cerrarSesion();
    this.store.limpiar();
    void this.router.navigate(['/login']);
  }
}
