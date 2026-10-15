import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component'; // Ajusta tu ruta si es necesario
import { SignupComponent } from './components/signup/signup.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent }
];
