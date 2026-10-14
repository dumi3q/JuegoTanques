import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  public paginas = [
    {title: 'LogIN', url: '/login', icon: 'log-in' }, 
    { title: 'Inicio', url: '/home', icon: 'home' },
    { title: 'Juego', url: '/game', icon: 'game' },
    { title: 'Configuración', url: '/settings', icon: 'settings' }, 
    { title: 'Salas', url: '/lobbies', icon: 'people' },
    { title: 'Crear Sala', url: '/create-lobby', icon: 'add' },
    { title: 'Perfil', url: '/profile', icon: 'person' },
    { title: 'Ranking', url: '/ranking', icon: 'trophy' },
    { title: 'Partida Offline', url: '/offline-game', icon: 'offline'  }
  ];


  


  constructor() {}
}
