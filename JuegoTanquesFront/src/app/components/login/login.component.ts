import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent, IonInput, IonButton, IonIcon, AlertController
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardSubtitle, IonCardContent, IonInput, IonButton, IonIcon
  ]
})
export class LoginComponent {
  correo: string = '';
  pass: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) { }

  toggleDarkMode() {
    document.body.classList.toggle('dark');
  }

  irARegistro() {
    this.router.navigate(['/signup']);
  }

  async iniciarSesion() {
    const exito = this.authService.login(this.correo, this.pass);
    if (exito) {
      // Navegar a la pantalla principal del juego (ej: /game o /dashboard)
      this.router.navigate(['/game']);
    } else {
      const alert = await this.alertController.create({
        header: 'Error de acceso',
        message: 'Correo o contraseña incorrectos, o la cuenta no existe.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}
