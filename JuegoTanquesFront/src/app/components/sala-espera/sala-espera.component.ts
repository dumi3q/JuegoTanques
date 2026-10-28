import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SignalrService } from '../../services/signalr';
import {
  IonContent, IonButton, IonIcon, IonBadge,
  IonItem, IonLabel
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  exitOutline, playCircleOutline, checkmarkCircleOutline,
  timeOutline, shieldOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-sala-espera',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonItem,
    IonLabel
  ],
  templateUrl: './sala-espera.component.html',
  styleUrls: ['./sala-espera.component.scss'],
})
export class SalaEsperaComponent implements OnInit, OnDestroy {
  sala: any = null;
  usuarioIdActual: number = 0;
  esHost: boolean = false;
  miEstadoListo: boolean = false;

  private subSala?: Subscription;
  private subPartida?: Subscription;

  private signalrService = inject(SignalrService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({
      'exit-outline': exitOutline,
      'play-circle-outline': playCircleOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'time-outline': timeOutline,
      'shield-outline': shieldOutline
    });

    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const u = JSON.parse(usuarioStr);
        this.usuarioIdActual = u.usuarioId || u.id || 0;
      } catch (e) {
        console.error('Error al leer el usuario', e);
      }
    }
  }

  async ngOnInit(): Promise<void> {
    // 1. Recibir datos del Hub en tiempo real
    this.subSala = this.signalrService.salaActual$.subscribe((detalle: any) => {
      console.log('🔍 [LOBBY DEBUG] Objeto crudo recibido:', JSON.stringify(detalle, null, 2));
      if (detalle) {
        // 🟢 Desenvolvemos la propiedad .sala si viene anidada, o usamos el objeto directo
        const datosCrudos = detalle.sala ? detalle.sala : detalle;
        this.sala = datosCrudos.sala ? datosCrudos.sala : datosCrudos;

        const hostId = this.sala.hostUsuarioId ?? this.sala.HostUsuarioId ?? 0;
        this.esHost = hostId === this.usuarioIdActual;

        const listaJugadores = this.sala.jugadores || this.sala.Jugadores || [];
        const yo = listaJugadores.find((j: any) => (j.usuarioId ?? j.UsuarioId) === this.usuarioIdActual);
        if (yo) {
          this.miEstadoListo = yo.listo ?? yo.Listo ?? false;
        }
        this.cdr.detectChanges();
      }
    });

    // 2. Si el BehaviorSubject ya tenía la sala guardada al navegar
    const valorActual = (this.signalrService as any).salaActualSubject?.value;
    if (valorActual) {
      console.log('🔍 [LOBBY DEBUG] Valor actual en subject:', JSON.stringify(valorActual, null, 2));
      const datosCrudos = valorActual.sala ? valorActual.sala : valorActual;
      this.sala = datosCrudos.sala ? datosCrudos.sala : datosCrudos;

      const hostId = this.sala.hostUsuarioId ?? this.sala.HostUsuarioId ?? 0;
      this.esHost = hostId === this.usuarioIdActual;
      this.cdr.detectChanges();
    }

    this.subPartida = this.signalrService.partidaIniciada$.subscribe((detalle: any) => {
      if (detalle) {
        void this.router.navigate(['/game']);
      }
    });
  }

  ngOnDestroy(): void {
    this.subSala?.unsubscribe();
    this.subPartida?.unsubscribe();
  }

  get puedeIniciarPartida(): boolean {
    if (!this.sala) return false;
    const lista = this.sala.jugadores || this.sala.Jugadores || [];
    console.log('👥 Jugadores actuales en la sala para iniciar:', lista.length);
    return lista.length >= 2;
  }

  async marcarListo(): Promise<void> {
    try {
      await this.signalrService.marcarListo();
    } catch (e) {
      console.error('Error al marcar listo:', e);
    }
  }

  async iniciarPartida(): Promise<void> {
    try {
      const error = await this.signalrService.iniciarPartida();
      if (error) {
        alert(error);
      }
    } catch (e) {
      console.error('Error al iniciar partida:', e);
    }
  }

  async salirSala(): Promise<void> {
    try {
      await this.signalrService.salirSala();
      void this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (e) {
      void this.router.navigateByUrl('/home', { replaceUrl: true });
    }
  }
}
