import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonButton, IonIcon, IonBadge,
  IonProgressBar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { TANQUES_JUEGO, ARMAS_JUEGO, Tanque, Arma } from '../../models/game-data';

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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

  tipoCategoria: 'tanques' | 'armas' = 'tanques';

  tanques: Tanque[] = TANQUES_JUEGO;
  armas: Arma[] = ARMAS_JUEGO;

  indiceActual: number = 0;
  indiceActualArma: number = 0;

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline
    });
  }

  cambiarCategoria(categoria: 'tanques' | 'armas') {
    this.tipoCategoria = categoria;
    this.indiceActual = 0;
    this.indiceActualArma = 0;
  }

  get tanqueActual(): Tanque {
    return this.tanques[this.indiceActual];
  }

  get armaActual(): Arma {
    return this.armas[this.indiceActualArma];
  }

  siguiente() {
    if (this.tipoCategoria === 'tanques') {
      this.indiceActual = (this.indiceActual + 1) % this.tanques.length;
    } else {
      this.indiceActualArma = (this.indiceActualArma + 1) % this.armas.length;
    }
  }

  anterior() {
    if (this.tipoCategoria === 'tanques') {
      this.indiceActual = (this.indiceActual - 1 + this.tanques.length) % this.tanques.length;
    } else {
      this.indiceActualArma = (this.indiceActualArma - 1 + this.armas.length) % this.armas.length;
    }
  }

  comprarOEquiparTanque(tanque: Tanque) {
    console.log('Tanque seleccionado:', tanque.nombre);
  }

  comprarOEquiparArma(arma: Arma) {
    console.log('Arma seleccionada:', arma.nombre);
  }
}
