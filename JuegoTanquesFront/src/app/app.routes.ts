import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { OnlineGameComponent } from './game-engine/OnlineGameComponent';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Públicas
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signup', loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent), canActivate: [guestGuard] },

  // Requieren sesión
  { path: 'home', component: InicioComponent, canActivate: [authGuard] },
  { path: 'offline', loadComponent: () => import('./components/offline/offline.component').then(m => m.OfflineComponent), canActivate: [authGuard] },
  { path: 'store', loadComponent: () => import('./components/tienda/tienda.component').then(m => m.TiendaComponent), canActivate: [authGuard] },
  { path: 'salas', loadComponent: () => import('./components/salas/salas.component').then(m => m.SalasComponent), canActivate: [authGuard] },
  { path: 'sala-espera', loadComponent: () => import('./components/sala-espera/sala-espera.component').then(m => m.SalaEsperaComponent), canActivate: [authGuard] },
  { path: 'ranking', loadComponent: () => import('./components/ranking/ranking.component').then(m => m.RankingComponent), canActivate: [authGuard] },
  { path: 'perfil', loadComponent: () => import('./components/perfil/perfil.component').then(m => m.PerfilComponent), canActivate: [authGuard] },
  { path: 'game-online', component: OnlineGameComponent, canActivate: [authGuard] },
  { path: 'settings', loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent), canActivate: [authGuard] },
  { path: 'game', loadComponent: () => import('./game-engine/game-play.component').then(m => m.GamePlayComponent), canActivate: [authGuard] },

  { path: '**', redirectTo: 'login' }
];
