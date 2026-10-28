import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonContent, IonSegment, IonSegmentButton,
  IonLabel, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trophyOutline, medalOutline, starOutline } from 'ionicons/icons';
import { JuegoStore } from '../../services/juego-store.service';
import { IRankingItem } from '../../models/IJuego';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon
  ],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss'],
})
export class RankingComponent implements OnInit, ViewWillEnter {
  readonly store = inject(JuegoStore);

  readonly filtroActual = signal<'nivel' | 'victorias'>('nivel');

  readonly jugadoresOrdenados = computed<IRankingItem[]>(() => {
    const lista = [...this.store.ranking()];
    if (this.filtroActual() === 'nivel') {
      lista.sort((a, b) => b.nivel - a.nivel || b.victorias - a.victorias);
    } else {
      lista.sort((a, b) => b.victorias - a.victorias || b.nivel - a.nivel);
    }
    return lista.map((j, i) => ({ ...j, posicion: i + 1 }));
  });

  constructor() {
    addIcons({
      'trophy-outline': trophyOutline,
      'medal-outline': medalOutline,
      'star-outline': starOutline
    });
  }

  ngOnInit(): void {
    void this.store.cargarRanking();
  }

  async ionViewWillEnter(): Promise<void> {
    void this.store.cargarRanking();
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  cambiarFiltro(event: any) {
    this.filtroActual.set(event.detail.value);
  }

  esYo(jugador: IRankingItem): boolean {
    return jugador.usuarioId === this.store.resumen()?.usuarioId;
  }
}
