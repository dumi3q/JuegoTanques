import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ILoginSolicitud,
  IGoogleLoginSolicitud,
  IRegistroRespuesta,
  IRegistroUsuarioSolicitud,
  ISesionRespuesta,
  IVerificarCorreoSolicitud,
  RolUsuario,
} from '../models/IAuth';
import { IRespuesta } from '../models/IRespuesta';

interface JwtPayload {
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly claveSesion = 'tienda-sesion';

  login(
    correo: string,
    contrasena: string,
  ): Observable<IRespuesta<ISesionRespuesta>> {
    const credenciales: ILoginSolicitud = { correo, contrasena };
    return this.http.post<IRespuesta<ISesionRespuesta>>(
      `${environment.baseUrl}/Auth/Login`,
      credenciales,
    );
  }

  loginGoogle(token: string): Observable<IRespuesta<ISesionRespuesta>> {
    const solicitud: IGoogleLoginSolicitud = { token };
    return this.http.post<IRespuesta<ISesionRespuesta>>(
      `${environment.baseUrl}/Auth/Google`,
      solicitud,
    );
  }

  registrar(
    datos: IRegistroUsuarioSolicitud,
  ): Observable<IRespuesta<IRegistroRespuesta>> {
    return this.http.post<IRespuesta<IRegistroRespuesta>>(
      `${environment.baseUrl}/Auth/Registrar`,
      datos,
    );
  }

  verificarCorreo(
    datos: IVerificarCorreoSolicitud,
  ): Observable<IRespuesta<ISesionRespuesta>> {
    return this.http.post<IRespuesta<ISesionRespuesta>>(
      `${environment.baseUrl}/Auth/VerificarCorreo`,
      datos,
    );
  }

  reenviarCodigo(correo: string): Observable<IRespuesta<string>> {
    return this.http.post<IRespuesta<string>>(
      `${environment.baseUrl}/Auth/ReenviarCodigo`,
      { correo },
    );
  }

  guardarSesion(sesion: ISesionRespuesta): boolean {
    if (
      !this.esEstructuraSesionValida(sesion) ||
      this.tokenExpirado(sesion.token)
    ) {
      this.cerrarSesion();
      return false;
    }

    localStorage.removeItem(this.claveSesion);
    sessionStorage.setItem(this.claveSesion, JSON.stringify(sesion));
    return true;
  }

  obtenerSesion(): ISesionRespuesta | null {
    const sesion = this.leerSesionAlmacenada();
    if (!sesion || this.tokenExpirado(sesion.token)) {
      this.cerrarSesion();
      return null;
    }
    return sesion;
  }

  obtenerToken(): string | null {
    return this.obtenerSesion()?.token ?? null;
  }

  obtenerRol(): RolUsuario | null {
    return this.obtenerSesion()?.rol ?? null;
  }

  tieneSesionValida(): boolean {
    return this.obtenerSesion() !== null;
  }

  tokenExpirado(token: string): boolean {
    const expiracion = this.obtenerExpiracion(token);
    if (expiracion === null) {
      return true;
    }
    return Date.now() >= expiracion * 1000;
  }

  cerrarSesion(): void {
    localStorage.removeItem(this.claveSesion);
    sessionStorage.removeItem(this.claveSesion);
  }

  private leerSesionAlmacenada(): ISesionRespuesta | null {
    const valor = sessionStorage.getItem(this.claveSesion);
    if (!valor) return null;
    try {
      const sesion: unknown = JSON.parse(valor);
      if (!this.esEstructuraSesionValida(sesion)) return null;
      return sesion;
    } catch {
      return null;
    }
  }

  private esEstructuraSesionValida(valor: unknown): valor is ISesionRespuesta {
    if (!valor || typeof valor !== 'object') return false;
    const sesion = valor as Partial<ISesionRespuesta>;
    const rolValido = sesion.rol === 'Administrador' || sesion.rol === 'Cliente';
    return (
      typeof sesion.token === 'string' &&
      sesion.token.length > 0 &&
      typeof sesion.idUsuario === 'number' &&
      sesion.idUsuario > 0 &&
      typeof sesion.nombre === 'string' &&
      sesion.nombre.length > 0 &&
      rolValido
    );
  }

  private obtenerExpiracion(token: string): number | null {
    try {
      const partes = token.split('.');
      if (partes.length !== 3) return null;
      const base64 = partes[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(partes[1].length / 4) * 4, '=');
      const payload = JSON.parse(atob(base64)) as JwtPayload;
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }
}
