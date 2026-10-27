namespace JuegoTanques.Dominio.DTO;

public class RegistroUsuarioDto
{
    // Nombre de usuario (el que verán los demás jugadores)
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public string Contrasena { get; set; } = string.Empty;
}