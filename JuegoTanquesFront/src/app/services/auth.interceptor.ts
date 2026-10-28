import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.obtenerToken();

  // 🔍 VAMOS A VER QUÉ DEVUELVE EXACTAMENTE AQUÍ
  console.log('🔍 [INTERCEPTOR] URL:', req.url);
  console.log('🔍 [INTERCEPTOR] Token detectado:', token ? 'SÍ EXISTE 🟢' : 'ES NULL (Se barrió) ❌');

  if (token) {
    // Clona la petición y le agrega la cabecera de autorización con el Bearer token
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
