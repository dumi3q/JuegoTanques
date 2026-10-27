import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  private readonly cdr = inject(ChangeDetectorRef);

  correo = '';
  contrasena = '';
  error = '';
  cargando = false;

  constructor() {
    addIcons({ 'moon-outline': moonOutline });
  }

  ingresar(): void {
    if (this.cargando) return; // evita enviar dos veces

    this.correo = this.correo.trim();
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
          this.actualizarPantalla();
          return;
        }

        this.cargando = false;
        this.actualizarPantalla();
        // Con sesión guardada, vamos al menú principal
        void this.router.navigateByUrl('/home');
      },
      error: (e: HttpErrorResponse) => {
        this.error = e.status === 0
          ? 'No se pudo conectar con el servidor. Revisa que la API esté corriendo.'
          : (e.error?.error || 'Usuario o contraseña incorrectos.');
        this.cargando = false;
        this.actualizarPantalla();
      },
    });
  }

  irARegistro(): void {
    void this.router.navigate(['/signup']);
  }

  toggleDarkMode(): void {
    document.body.classList.toggle('dark');
  }

  // Fuerza a Angular a redibujar la pantalla con los valores nuevos
  // (así no depende de zone.js para mostrar errores o el estado "Ingresando...")
  private actualizarPantalla(): void {
    this.cdr.detectChanges();
  }
}
