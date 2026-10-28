
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const baseUrl = environment.baseUrl.replace(/\/+$/, '');
  const esNuestraApi =
    req.url === baseUrl || req.url.startsWith(baseUrl + '/');

  const token = esNuestraApi ? auth.obtenerToken() : null;

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (
    req.url.startsWith(
      'https://hydrant-atonable-broiling.ngrok-free.dev/'
    )
  ) {
    headers['ngrok-skip-browser-warning'] = '1';
  }

  const peticion = Object.keys(headers).length
    ? req.clone({ setHeaders: headers })
    : req;

  console.log('🌐 [API]', req.method, req.url);

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('❌ [API ERROR]', {
        url: req.url,
        status: error.status,
        message: error.message,
        error: error.error
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
