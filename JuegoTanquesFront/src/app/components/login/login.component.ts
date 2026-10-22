import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonCard, IonItem, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent, IonInput, IonButton,
  IonIcon, IonButtons, IonText
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moonOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    IonContent, IonCard, IonCardHeader, IonCardTitle,
    IonCardSubtitle, IonCardContent, IonInput, IonButton,
    IonIcon, IonButtons, IonText, IonItem
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  correo = '';
  contrasena = '';
  error = '';
  cargando = false;

  constructor() {
    addIcons({ 'moon-outline': moonOutline });
  }

  ingresar(): void {
    if (!this.correo || !this.contrasena) {
      this.error = 'Por favor, llena todos los campos.';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.authService.login(this.correo, this.contrasena).subscribe({
      next: (respuesta) => {
        if (respuesta.error || !respuesta.data || !this.authService.guardarSesion(respuesta.data)) {
          this.error = respuesta.error || 'La respuesta de sesión no es válida.';
          this.cargando = false;
          return;
        }
        this.redirigirSegunRol(respuesta.data.rol);
      },
      error: (respuesta) => {
        this.error = respuesta.error?.error || 'Correo o contraseña inválidos.';
        this.cargando = false;
      },
    });
  }

  irARegistro(): void {
    void this.router.navigate(['/signup']);
  }

  toggleDarkMode(): void {
    document.body.classList.toggle('dark');
  }

  private redirigirSegunRol(rol: string): void {
    const destino = rol === 'Cliente' ? '/tienda' : '/';
    void this.router.navigateByUrl(destino);
  }
}
