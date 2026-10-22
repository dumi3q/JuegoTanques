import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent, IonInput, IonButton,
  IonIcon, IonButtons, IonText, IonChip, IonLabel, IonItem
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moonOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    IonContent, IonCard, IonCardHeader, IonCardTitle,
    IonCardSubtitle, IonCardContent, IonInput, IonButton,
    IonIcon, IonButtons, IonText, IonChip, IonLabel, IonItem
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Campos de Registro
  cedula = '';
  nombre = '';
  apellido = '';
  correo = '';
  contrasena = '';

  // Control OTP, sugerencias y estados
  verificarCorreo = false;
  codigoOtp = '';
  error = '';
  mensaje = '';
  codigoDesarrollo = '';
  cargando = false;
  sugerenciasNombres: string[] = []; // 👈 Variable para almacenar las sugerencias

  constructor() {
    addIcons({ 'moon-outline': moonOutline });
  }

  registrar(): void {
    if (!this.nombre || !this.correo || !this.contrasena) {
      this.error = 'Por favor, llena los campos obligatorios.';
      return;
    }

    this.cargando = true;
    this.error = '';
    this.mensaje = '';
    this.sugerenciasNombres = []; // Limpiamos sugerencias previas

    this.authService.registrar({
      cedula: this.cedula || '000000000',
      nombre: this.nombre,
      apellido: this.apellido || 'N/A',
      correo: this.correo,
      contrasena: this.contrasena,
    }).subscribe({
      next: (respuesta) => {
        if (respuesta.error || !respuesta.data) {
          this.error = respuesta.error || 'No fue posible crear la cuenta.';
          this.cargando = false;
          return;
        }

        this.verificarCorreo = true;
        this.mensaje = respuesta.data.mensaje;
        this.codigoDesarrollo = respuesta.data.codigoDesarrollo ?? '';
        this.cargando = false;
      },
      error: (respuesta) => {
        this.error = respuesta.error?.error || 'No fue posible crear la cuenta.';

        // 👈 Atrapamos las sugerencias si el backend las envía
        if (respuesta.error?.sugerencias) {
          this.sugerenciasNombres = respuesta.error.sugerencias;
        }

        this.cargando = false;
      },
    });
  }

  // 👈 Método para seleccionar una sugerencia y rellenar el campo de nombre automáticamente
  usarSugerencia(sugerencia: string): void {
    this.nombre = sugerencia;
    this.sugerenciasNombres = [];
    this.error = '';
  }

  confirmarCorreo(): void {
    if (!this.codigoOtp) {
      this.error = 'Ingresa el código OTP.';
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
          return;
        }
        this.redirigirSegunRol(respuesta.data.rol);
      },
      error: (respuesta) => {
        this.error = respuesta.error?.error || 'Código incorrecto o expirado.';
        this.cargando = false;
      },
    });
  }

  reenviarCodigo(): void {
    this.cargando = true;
    this.error = '';

    this.authService.reenviarCodigo(this.correo).subscribe({
      next: (respuesta) => {
        this.mensaje = respuesta.data || 'Se solicitó un nuevo código.';
        this.cargando = false;
      },
      error: () => {
        this.error = 'No fue posible solicitar un nuevo código.';
        this.cargando = false;
      },
    });
  }

  irALogin(): void {
    void this.router.navigate(['/login']);
  }

  toggleDarkMode(): void {
    document.body.classList.toggle('dark');
  }

  private redirigirSegunRol(rol: string): void {
    const destino = rol === 'Cliente' ? '/tienda' : '/';
    void this.router.navigateByUrl(destino);
  }
}
