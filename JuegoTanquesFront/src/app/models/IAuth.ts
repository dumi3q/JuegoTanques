export type RolUsuario = 'Administrador' | 'Cliente';

export interface ILoginSolicitud {
  correo: string;
  contrasena: string;
}

export interface IGoogleLoginSolicitud {
  token: string;
}

export interface IRegistroUsuarioSolicitud {
  cedula: string;
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
}

export interface IRegistroRespuesta {
  mensaje: string;
  codigoDesarrollo?: string;
}

export interface ISesionRespuesta {
  token: string;
  idUsuario: number;
  nombre: string;
  rol: RolUsuario;
}

export interface IVerificarCorreoSolicitud {
  correo: string;
  codigo: string;
}
