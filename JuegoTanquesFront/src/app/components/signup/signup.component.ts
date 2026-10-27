import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
export class SignupComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Campos del formulario
  nombre = '';
  correo = '';
  contrasena = '';

  // Paso 2: código que llega al correo
  verificarCorreo = false;
  codigoOtp = '';

  // Estado de la pantalla
  error = '';
  mensaje = '';
  codigoDesarrollo = '';
  cargando = false;
  sugerenciasNombres: string[] = [];

  // ---------- Paso 1: crear la cuenta y pedir el código ----------
  registrar(): void {
    if (this.cargando) return; // evita enviar dos veces

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

  // Toca un nombre sugerido y se pone solo en el campo
  usarSugerencia(sugerencia: string): void {
    this.nombre = sugerencia;
    this.sugerenciasNombres = [];
    this.error = '';
  }

  // ---------- Paso 2: confirmar el código ----------
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
        // Cuenta creada y sesión iniciada: al menú principal
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

  // Si el correo estaba mal escrito, vuelve al formulario
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

  // Muestra el mensaje de error de la API (y los nombres sugeridos si vienen)
  private mostrarError(e: HttpErrorResponse, porDefecto: string): void {
    if (e.status === 0) {
      this.error = 'No se pudo conectar con el servidor. Revisa que la API esté corriendo y la dirección de environment.ts.';
      return;
    }
    this.error = e.error?.error || porDefecto;
    if (Array.isArray(e.error?.sugerencias)) {
      this.sugerenciasNombres = e.error.sugerencias;
    }
  }

  // Fuerza a Angular a redibujar la pantalla con los valores nuevos
  // (así no depende de zone.js para mostrar el paso del código, los errores o los botones)
  private actualizarPantalla(): void {
    this.cdr.detectChanges();
  }
}
