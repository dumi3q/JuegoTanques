import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonSegment, IonSegmentButton,
  IonLabel, IonList, IonItem, IonAvatar, IonBadge, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trophyOutline, medalOutline, starOutline } from 'ionicons/icons';

interface JugadorRanking {
  posicion: number;
  nombre: string;
  nivel: number;
  victorias: number;
  derrotas: number;
  avatar: string;
}

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonAvatar,
    IonBadge,
    IonIcon
  ],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss'],
})
export class RankingComponent {

  filtroActual: 'nivel' | 'victorias' = 'nivel';

  jugadores: JugadorRanking[] = [
    { posicion: 1, nombre: 'Comandante_Viper', nivel: 45, victorias: 120, derrotas: 15, avatar: 'assets/imgs/avatars/user1.png' },
    { posicion: 2, nombre: 'Tank_Destroyer', nivel: 42, victorias: 105, derrotas: 22, avatar: 'assets/imgs/avatars/user2.png' },
    { posicion: 3, nombre: 'Iron_Shield', nivel: 38, victorias: 89, derrotas: 30, avatar: 'assets/imgs/avatars/user3.png' },
    { posicion: 4, nombre: 'Shadow_Artillery', nivel: 30, victorias: 64, derrotas: 28, avatar: 'assets/imgs/avatars/user4.png' },
    { posicion: 5, nombre: 'Ghost_Rider_CR', nivel: 25, victorias: 51, derrotas: 40, avatar: 'assets/imgs/avatars/user5.png' },
    { posicion: 6, nombre: 'Alpha_Strike', nivel: 18, victorias: 32, derrotas: 20, avatar: 'assets/imgs/avatars/user6.png' }
  ];

  constructor() {
    addIcons({
      'trophy-outline': trophyOutline,
      'medal-outline': medalOutline,
      'star-outline': starOutline
    });
  }

  // Ordena dinámicamente según la opción seleccionada
  get jugadoresOrdenados(): JugadorRanking[] {
    const lista = [...this.jugadores];
    if (this.filtroActual === 'nivel') {
      lista.sort((a, b) => b.nivel - a.nivel);
    } else {
      lista.sort((a, b) => b.victorias - a.victorias);
    }
    // Reasignar la posición según el ordenamiento
    return lista.map((j, index) => ({ ...j, posicion: index + 1 }));
  }

  cambiarFiltro(event: any) {
    this.filtroActual = event.detail.value;
  }
}
