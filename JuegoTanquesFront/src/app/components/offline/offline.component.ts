import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TANQUES_JUEGO, ARMAS_JUEGO } from '../../models/game-data';

import {
  IonContent, IonButton, IonIcon, IonRange,
  IonBadge
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, peopleOutline, playOutline } from 'ionicons/icons';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonRange,
    IonBadge
  ],
  templateUrl: './offline.component.html',
  styleUrls: ['./offline.component.scss'],
})
export class OfflineComponent {

  private router = inject(Router);

  config = {
    dificultad: 'normal',
    numBots: 3,
    rondas: 5,
    mapaSeleccionado: 'map1'
  };

  constructor() {
    addIcons({
      'person-outline': personOutline,
      'people-outline': peopleOutline,
      'play-outline': playOutline
    });
  }

  iniciarPartidaOffline() {
    console.log('Iniciando partida offline con configuración:', this.config);

    // Generar la lista de bots con tanques y armas aleatorias de los catálogos
    const botsConfigurados = [];

    for (let i = 0; i < this.config.numBots; i++) {
      // Seleccionar un tanque aleatorio de los disponibles en TANQUES_JUEGO
      const tanqueAleatorio = TANQUES_JUEGO[Math.floor(Math.random() * TANQUES_JUEGO.length)];

      // Seleccionar un arma aleatoria de ARMAS_JUEGO
      const armaAleatoria = ARMAS_JUEGO[Math.floor(Math.random() * ARMAS_JUEGO.length)];

      botsConfigurados.push({
        idBot: i + 1,
        tanque: tanqueAleatorio,
        arma: armaAleatoria,
        dificultad: this.config.dificultad
      });
    }

    console.log('Bots generados para la partida:', botsConfigurados);

    // Navegar al juego pasando los datos por State
    this.router.navigate(['/game'], {
      state: {
        config: this.config,
        bots: botsConfigurados
      }
    });
  }
}
