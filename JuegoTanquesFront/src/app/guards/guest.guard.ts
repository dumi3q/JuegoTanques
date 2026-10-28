import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Evita mostrar el login al volver a abrir la app con una sesión todavía válida.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.tieneSesionValida() ? router.createUrlTree(['/home']) : true;
};
