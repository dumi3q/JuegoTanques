import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonContent, IonInput, IonButton, IonChip, IonLabel, IonItem
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    IonContent, IonInput, IonButton, IonChip, IonLabel, IonItem
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements ViewWillEnter {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  nombre = '';
  correo = '';
  contrasena = '';

  verificarCorreo = false;
  codigoOtp = '';

  error = '';
  mensaje = '';
  codigoDesarrollo = '';
  cargando = false;
  sugerenciasNombres: string[] = [];

  async ionViewWillEnter(): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  registrar(): void {
    if (this.cargando) return;

    this.nombre = this.nombre.trim();
    this.correo = this.correo.trim();

    if (!this.nombre || !this.correo || !this.contrasena) {
      this.error = 'Llena el usuario, el correo y la contraseña.';
      return;
    }

    this.cargando = true;
    this.error = '';
    this.mensaje = '';
    this.sugerenciasNombres = [];

    this.authService.registrar({
      nombre: this.nombre,
      correo: this.correo,
      contrasena: this.contrasena,
    }).subscribe({
      next: (respuesta) => {
        if (respuesta.error || !respuesta.data) {
          this.error = respuesta.error || 'No fue posible crear la cuenta.';
          this.cargando = false;
          this.actualizarPantalla();
          return;
        }
        this.verificarCorreo = true;
        this.mensaje = respuesta.data.mensaje;
        this.codigoDesarrollo = respuesta.data.codigoDesarrollo ?? '';
        this.cargando = false;
        this.actualizarPantalla();
      },
      error: (e: HttpErrorResponse) => {
        this.mostrarError(e, 'No fue posible crear la cuenta.');
        this.cargando = false;
        this.actualizarPantalla();
      },
    });
  }

  usarSugerencia(sugerencia: string): void {
    this.nombre = sugerencia;
    this.sugerenciasNombres = [];
    this.error = '';
  }

  confirmarCorreo(): void {
    if (this.cargando) return;

    this.codigoOtp = this.codigoOtp.trim();
    if (!this.codigoOtp) {
      this.error = 'Escribe el código que te llegó al correo.';
      return;
    }

    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    this.authService.verificarCorreo({
      correo: this.correo,
      codigo: this.codigoOtp,
    }).subscribe({
      next: (respuesta) => {
        if (respuesta.error || !respuesta.data || !this.authService.guardarSesion(respuesta.data)) {
          this.error = respuesta.error || 'No fue posible verificar el correo.';
          this.cargando = false;
          this.actualizarPantalla();
          return;
        }
        this.cargando = false;
        this.actualizarPantalla();
        void this.router.navigateByUrl('/home');
      },
      error: (e: HttpErrorResponse) => {
        this.mostrarError(e, 'Código incorrecto o vencido.');
        this.cargando = false;
        this.actualizarPantalla();
      },
    });
  }

  reenviarCodigo(): void {
    if (this.cargando) return;

    this.cargando = true;
    this.error = '';
    this.mensaje = '';

    this.authService.reenviarCodigo(this.correo).subscribe({
      next: (respuesta) => {
        this.mensaje = respuesta.data || 'Te enviamos un nuevo código.';
        this.cargando = false;
        this.actualizarPantalla();
      },
      error: (e: HttpErrorResponse) => {
        this.mostrarError(e, 'No fue posible pedir un nuevo código.');
        this.cargando = false;
        this.actualizarPantalla();
      },
    });
  }

  volverAlFormulario(): void {
    this.verificarCorreo = false;
    this.codigoOtp = '';
    this.codigoDesarrollo = '';
    this.error = '';
    this.mensaje = '';
  }

  irALogin(): void {
    void this.router.navigate(['/login']);
  }

  private mostrarError(e: HttpErrorResponse, porDefecto: string): void {
    if (e.status === 0) {
      this.error = 'No se pudo conectar con el servidor. Revisa que la API esté corriendo.';
      return;
    }
    this.error = e.error?.error || porDefecto;
    if (Array.isArray(e.error?.sugerencias)) {
      this.sugerenciasNombres = e.error.sugerencias;
    }
  }

  private actualizarPantalla(): void {
    this.cdr.detectChanges();
  }
}
