import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ViewWillEnter, IonContent, IonButton, IonIcon, IonProgressBar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Tanque, Arma } from '../../models/game-data';
import { idDeCodigo } from '../../models/CatalogoUtil';
import { JuegoStore } from '../../services/juego-store.service';

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonProgressBar
  ],
  templateUrl: './tienda.component.html',
  styleUrls: ['./tienda.component.scss'],
})
export class TiendaComponent implements OnInit, ViewWillEnter {
  readonly store = inject(JuegoStore);

  tipoCategoria: 'tanques' | 'armas' = 'tanques';
  indiceActual: number = 0;
  indiceActualArma: number = 0;

  readonly mensaje = signal('');
  readonly ocupado = signal(false);

  constructor() {
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline
    });
  }

  ngOnInit(): void {
    if (!this.store.resumen()) void this.store.cargarTodo();
  }

  async ionViewWillEnter(): Promise<void> {
    if (!this.store.resumen()) void this.store.cargarTodo();
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  get tanques(): Tanque[] { return this.store.tanques(); }
  get armas(): Arma[] { return this.store.armas(); }
  get tanqueActual(): Tanque | undefined { return this.tanques[this.indiceActual]; }
  get armaActual(): Arma | undefined { return this.armas[this.indiceActualArma]; }
  get monedas(): number { return this.store.resumen()?.monedas ?? 0; }

  cambiarCategoria(categoria: 'tanques' | 'armas') {
    this.tipoCategoria = categoria;
    this.indiceActual = 0;
    this.indiceActualArma = 0;
    this.mensaje.set('');
  }

  siguiente() {
    if (this.tipoCategoria === 'tanques') {
      if (this.tanques.length) this.indiceActual = (this.indiceActual + 1) % this.tanques.length;
    } else if (this.armas.length) {
      this.indiceActualArma = (this.indiceActualArma + 1) % this.armas.length;
    }
    this.mensaje.set('');
  }

  anterior() {
    if (this.tipoCategoria === 'tanques') {
      if (this.tanques.length) this.indiceActual = (this.indiceActual - 1 + this.tanques.length) % this.tanques.length;
    } else if (this.armas.length) {
      if (this.armas.length) this.indiceActualArma = (this.indiceActualArma - 1 + this.armas.length) % this.armas.length;
    }
    this.mensaje.set('');
  }

  poseeTanque(t: Tanque): boolean {
    return this.store.inventario().tanqueIds.includes(idDeCodigo(t.tanque_id));
  }

  poseeArma(a: Arma): boolean {
    return this.store.inventario().armaIds.includes(idDeCodigo(a.arma_id));
  }

  tanqueEquipado(t: Tanque): boolean {
    return this.store.tanqueEquipado()?.tanque_id === t.tanque_id;
  }

  armaEquipada(a: Arma): boolean {
    return this.store.armaEquipada()?.arma_id === a.arma_id;
  }

  async accionTanque(t: Tanque) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    try {
      if (this.poseeTanque(t)) {
        await this.store.equipar({ tanqueId: idDeCodigo(t.tanque_id) });
        this.mensaje.set(`¡${t.nombre} equipado con éxito!`);
      } else {
        // 🟢 Usamos el método 'comprar' correcto del store pasando 'tanque' y el id numérico
        await this.store.comprar('tanque', idDeCodigo(t.tanque_id));
        this.mensaje.set(`¡Has comprado y equipado ${t.nombre}!`);
      }
    } catch (e) {
      this.mensaje.set(this.store.mensajeDe(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  async accionArma(a: Arma) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    try {
      if (this.poseeArma(a)) {
        await this.store.equipar({ armaId: idDeCodigo(a.arma_id) });
        this.mensaje.set(`¡${a.nombre} equipada con éxito!`);
      } else {
        // 🟢 Usamos el método 'comprar' correcto del store pasando 'arma' y el id numérico
        await this.store.comprar('arma', idDeCodigo(a.arma_id));
        this.mensaje.set(`¡Has comprado y equipado ${a.nombre}!`);
      }
    } catch (e) {
      this.mensaje.set(this.store.mensajeDe(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  textoBotonTanque(t: Tanque): string {
    if (this.tanqueEquipado(t)) return 'Equipado';
    if (this.poseeTanque(t)) return 'Equipar';
    return `Comprar (${t.precio} Monedas)`;
  }



  textoBotonArma(a: Arma): string {
    if (this.armaEquipada(a)) return 'Equipada';
    if (this.poseeArma(a)) return 'Equipar';
    return `Comprar (${a.precio} Monedas)`;
  }
}
