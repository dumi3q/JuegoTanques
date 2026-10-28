import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonContent, IonIcon, IonRange, IonToggle, IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  volumeHighOutline, gameControllerOutline, desktopOutline,
  saveOutline, refreshOutline
} from 'ionicons/icons';
import { AjustesService, IAjustes } from '../../services/ajustes.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonRange,
    IonToggle,
    IonButton
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements ViewWillEnter {
  private readonly servicio = inject(AjustesService);

  volumenEfectos: number = 90;
  sensibilidadApuntado: number = 50;

  apuntadoAsistido: boolean = true;
  vibracionImpacto: boolean = true;
  mostrarFps: boolean = false;

  readonly mensaje = signal('');

  constructor() {
    addIcons({
      'volume-high-outline': volumeHighOutline,
      'game-controller-outline': gameControllerOutline,
      'desktop-outline': desktopOutline,
      'save-outline': saveOutline,
      'refresh-outline': refreshOutline
    });

    this.cargar(this.servicio.ajustes());
  }

  async ionViewWillEnter(): Promise<void> {
    this.cargar(this.servicio.ajustes());
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  guardarAjustes() {
    this.servicio.guardar({
      volumenEfectos: this.volumenEfectos,
      sensibilidadApuntado: this.sensibilidadApuntado,
      apuntadoAsistido: this.apuntadoAsistido,
      vibracionImpacto: this.vibracionImpacto,
      mostrarFps: this.mostrarFps,
    });
    this.avisar('Ajustes guardados ✔');
  }

  restablecerValores() {
    this.cargar(this.servicio.restablecer());
    this.avisar('Se restablecieron los valores por defecto.');
  }

  private cargar(a: IAjustes) {
    this.volumenEfectos = a.volumenEfectos;
    this.sensibilidadApuntado = a.sensibilidadApuntado;
    this.apuntadoAsistido = a.apuntadoAsistido;
    this.vibracionImpacto = a.vibracionImpacto;
    this.mostrarFps = a.mostrarFps;
  }

  private avisar(texto: string) {
    this.mensaje.set(texto);
    setTimeout(() => this.mensaje.set(''), 2500);
  }
}
