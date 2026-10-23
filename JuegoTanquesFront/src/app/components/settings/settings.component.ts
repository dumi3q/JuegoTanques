import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonList, IonItem, IonLabel, IonIcon,
  IonRange, IonToggle, IonSelect, IonSelectOption, IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  volumeHighOutline, gameControllerOutline, desktopOutline,
  saveOutline, refreshOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonRange,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonButton
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {

  // Variables de configuración visual
  volumenMusica: number = 75;
  volumenEfectos: number = 90;
  sensibilidadApuntado: number = 50;

  apuntadoAsistido: boolean = true;
  vibracionImpacto: boolean = true;
  efectosHumo: boolean = true;

  calidadGrafica: string = 'alta';
  modoPantalla: string = 'pantalla_completa';

  constructor() {
    addIcons({
      'volume-high-outline': volumeHighOutline,
      'game-controller-outline': gameControllerOutline,
      'desktop-outline': desktopOutline,
      'save-outline': saveOutline,
      'refresh-outline': refreshOutline
    });
  }

  guardarAjustes() {
    console.log('Ajustes guardados correctamente');
  }

  restablecerValores() {
    this.volumenMusica = 75;
    this.volumenEfectos = 90;
    this.sensibilidadApuntado = 50;
    this.apuntadoAsistido = true;
    this.vibracionImpacto = true;
    this.efectosHumo = true;
    this.calidadGrafica = 'alta';
  }
}
