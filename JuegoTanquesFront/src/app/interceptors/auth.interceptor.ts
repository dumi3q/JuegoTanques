
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const esNuestraApi = req.url.startsWith(environment.baseUrl);
  const esNgrok = req.url.startsWith(
    'https://hydrant-atonable-broiling.ngrok-free.dev/'
  );

  const token = esNuestraApi ? auth.obtenerToken() : null;

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Evita la página de advertencia de ngrok para peticiones HTTP
  if (esNgrok) {
    headers['ngrok-skip-browser-warning'] = '1';
  }

  const peticion = Object.keys(headers).length
    ? req.clone({ setHeaders: headers })
    : req;

  console.log('🌐 [API]', req.method, req.url);
  console.log('🔐 [JWT]', token ? 'Token encontrado' : 'Sin token');

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('❌ [HTTP]', {
        url: req.url,
        status: error.status,
        mensaje: error.message,
        respuesta: error.error
      });

      if (
        error.status === 401 &&
        esNuestraApi &&
        !req.url.toLowerCase().includes('/auth/')
      ) {
        auth.cerrarSesion();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
