import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    // Aquí puedes disparar la navegación o inicializar la matriz del mapa con los bots
  }
}
