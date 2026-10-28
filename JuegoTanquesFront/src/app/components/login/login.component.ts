import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonContent, IonCard, IonItem, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent, IonInput, IonButton,
  IonIcon, IonButtons, IonText
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moonOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { SignalrService } from '../../services/signalr'; // 🟢 Importamos el servicio de SignalR

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
export class LoginComponent implements ViewWillEnter {
  private readonly authService = inject(AuthService);
  private readonly signalrService = inject(SignalrService); // 🟢 Inyectamos SignalR
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  correo = '';
  contrasena = '';
  error = '';
  cargando = false;

  constructor() {
    addIcons({ 'moon-outline': moonOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch (e) { }
  }

  ingresar(): void {
    if (this.cargando) return;

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

        // 🟢 Extraemos el token recién guardado o devuelto para conectar SignalR de una vez
        const tokenActivo = respuesta.data.token || localStorage.getItem('token') || '';

        // 🟢 Disparamos la conexión al Hub con el token en caliente antes de navegar
        void this.signalrService.iniciarConexion(tokenActivo);

        this.cargando = false;
        this.actualizarPantalla();
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

  private actualizarPantalla(): void {
    this.cdr.detectChanges();
  }
}
