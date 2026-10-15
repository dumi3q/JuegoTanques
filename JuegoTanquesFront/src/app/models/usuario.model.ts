export interface TUsuario {
  UsuarioId?: string;
  Username?: string;
  Email?: string;
  PasswordHash?: string;
}
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}
