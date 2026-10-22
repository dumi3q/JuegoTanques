import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';

export const routes: Routes = [
  // Ruta inicial que te manda al Login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  // Ruta para tu menú principal con el dashboard y las secciones
  { path: 'home', component: InicioComponent },

  { path: 'signup', loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent) }, 
  // Por si escriben cualquier otra cosa, los manda al login
  { path: '**', redirectTo: 'login' }
];
