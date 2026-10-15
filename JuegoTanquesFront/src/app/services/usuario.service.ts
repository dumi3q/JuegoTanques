import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TUsuario, ApiResponse } from '../models/usuario.model';
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private http = inject(HttpClient);

  private readonly baseUrl = 'https://localhost:7123/api/Usuario';

  listar(): Observable<ApiResponse<TUsuario[]>> {
    return this.http.get<ApiResponse<TUsuario[]>>(`${this.baseUrl}/Listar`);
  }

  obtener(id: number): Observable<ApiResponse<TUsuario>> {
    return this.http.get<ApiResponse<TUsuario>>(`${this.baseUrl}/Obtener/${id}`);
  }

  buscar(id: number): Observable<ApiResponse<TUsuario>> {
    return this.http.get<ApiResponse<TUsuario>>(`${this.baseUrl}/Buscar/${id}`);
  }

  insertar(dato: Partial<TUsuario>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/Insertar`, dato);
  }

  modificar(dato: TUsuario): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/Modificar`, dato);
  }
  eliminar(dato: TUsuario): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/Eliminar`, {
      body: dato
    });

  }
  
}
