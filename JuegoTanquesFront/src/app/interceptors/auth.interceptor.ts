import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Solo le ponemos el token a las peticiones que van a nuestra API
  const esNuestraApi = req.url.startsWith(environment.baseUrl);
  const token = esNuestraApi ? auth.obtenerToken() : null;
  const peticion = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 fuera del login: la sesión venció
      if (error.status === 401 && esNuestraApi && !req.url.includes('/Auth/')) {
        auth.cerrarSesion();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
