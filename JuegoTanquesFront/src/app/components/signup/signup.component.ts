import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent, IonInput, IonButton, IonIcon, AlertController
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardSubtitle, IonCardContent, IonInput, IonButton, IonIcon
  ]
})
export class SignupComponent {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private alertController: AlertController = inject(AlertController);

  correo: string = '';
  pass: string = '';

  constructor() { }

  toggleDarkMode() {
    document.body.classList.toggle('dark');
  }

  irALogin() {
    this.router.navigate(['/login']);
  }

  async crearCuenta() {
    if (!this.correo || !this.pass) {
      const alert = await this.alertController.create({
        header: 'Campos vacíos',
        message: 'Por favor completa todos los campos.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const registrado = this.authService.registrar(this.correo, this.pass);
    if (registrado) {
      const alert = await this.alertController.create({
        header: '¡Éxito!',
        message: 'Cuenta creada correctamente. Ya puedes iniciar sesión.',
        buttons: [{
          text: 'OK',
          handler: () => this.router.navigate(['/login'])
        }]
      });
      await alert.present();
    } else {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Este correo o usuario ya está registrado.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}
