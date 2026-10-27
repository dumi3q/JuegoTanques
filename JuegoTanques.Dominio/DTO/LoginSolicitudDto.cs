namespace JuegoTanques.Dominio.DTO;

public class LoginSolicitudDto
{
    // Puede venir el correo o el nombre de usuario
    public string Correo { get; set; } = string.Empty;
    public string Contrasena { get; set; } = string.Empty;
}