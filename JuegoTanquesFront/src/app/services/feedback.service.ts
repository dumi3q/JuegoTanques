import { Injectable, inject } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AjustesService } from './ajustes.service';

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly ajustes = inject(AjustesService);
  private audioContext: AudioContext | null = null;

  disparo(tipoArma: string): void {
    const frecuencia = tipoArma === 'WEAP-03' ? 115 : tipoArma === 'WEAP-01' ? 165 : 220;
    this.tono(frecuencia, 0.075, 'square', 0.26);
    void this.vibrar(ImpactStyle.Light);
  }

  impactoEnemigo(): void {
    this.tono(520, 0.055, 'triangle', 0.2);
    window.setTimeout(() => this.tono(760, 0.04, 'sine', 0.14), 35);
    void this.vibrar(ImpactStyle.Medium);
  }

  impactoRecibido(): void {
    this.tono(92, 0.13, 'sawtooth', 0.3);
    void this.vibrar(ImpactStyle.Heavy);
  }

  private tono(frecuencia: number, duracion: number, tipo: OscillatorType, intensidad: number): void {
    const volumen = this.ajustes.ajustes().volumenEfectos / 100;
    if (volumen <= 0) return;

    try {
      const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!AudioCtor) return;
      this.audioContext ??= new AudioCtor();
      if (this.audioContext.state === 'suspended') void this.audioContext.resume();

      const inicio = this.audioContext.currentTime;
      const oscilador = this.audioContext.createOscillator();
      const ganancia = this.audioContext.createGain();
      oscilador.type = tipo;
      oscilador.frequency.setValueAtTime(frecuencia, inicio);
      oscilador.frequency.exponentialRampToValueAtTime(Math.max(45, frecuencia * 0.55), inicio + duracion);
      ganancia.gain.setValueAtTime(Math.max(0.0001, volumen * intensidad), inicio);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
      oscilador.connect(ganancia);
      ganancia.connect(this.audioContext.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + duracion);
    } catch {
      // Algunos navegadores no permiten audio hasta la primera interacción.
    }
  }

  private async vibrar(estilo: ImpactStyle): Promise<void> {
    if (!this.ajustes.ajustes().vibracionImpacto) return;
    try {
      await Haptics.impact({ style: estilo });
    } catch {
      // En escritorio o navegadores sin vibración se conserva únicamente el sonido.
    }
  }
}
