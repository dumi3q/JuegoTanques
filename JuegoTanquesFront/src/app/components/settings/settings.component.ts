import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonContent, IonList, IonItem, IonLabel, IonIcon,
  IonRange, IonToggle, IonSelect, IonSelectOption, IonButton
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
export class SettingsComponent implements ViewWillEnter {
  private readonly servicio = inject(AjustesService);

  volumenMusica: number = 75;
  volumenEfectos: number = 90;
  sensibilidadApuntado: number = 50;

  apuntadoAsistido: boolean = true;
  vibracionImpacto: boolean = true;
  efectosHumo: boolean = true;
  mostrarFps: boolean = false;

  calidadGrafica: string = 'alta';

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
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  guardarAjustes() {
    this.servicio.guardar({
      volumenMusica: this.volumenMusica,
      volumenEfectos: this.volumenEfectos,
      sensibilidadApuntado: this.sensibilidadApuntado,
      apuntadoAsistido: this.apuntadoAsistido,
      vibracionImpacto: this.vibracionImpacto,
      efectosHumo: this.efectosHumo,
      mostrarFps: this.mostrarFps,
      calidadGrafica: this.calidadGrafica,
    });
    this.avisar('Ajustes guardados ✔');
  }

  restablecerValores() {
    this.cargar(this.servicio.restablecer());
    this.avisar('Se restablecieron los valores por defecto.');
  }

  private cargar(a: IAjustes) {
    this.volumenMusica = a.volumenMusica;
    this.volumenEfectos = a.volumenEfectos;
    this.sensibilidadApuntado = a.sensibilidadApuntado;
    this.apuntadoAsistido = a.apuntadoAsistido;
    this.vibracionImpacto = a.vibracionImpacto;
    this.efectosHumo = a.efectosHumo;
    this.mostrarFps = a.mostrarFps;
    this.calidadGrafica = a.calidadGrafica;
  }

  private avisar(texto: string) {
    this.mensaje.set(texto);
    setTimeout(() => this.mensaje.set(''), 2500);
  }
}
