using System.Net;
using System.Net.Mail;

namespace JuegoTanques.API.Servicios;

public interface ICorreoServicio
{
    // true = el correo salió; false = no se pudo enviar
    Task<bool> EnviarCodigoAsync(string destino, string nombre, string codigo);
}

public class CorreoServicio : ICorreoServicio
{
    private readonly IConfiguration _config;
    private readonly ILogger<CorreoServicio> _log;

    public CorreoServicio(IConfiguration config, ILogger<CorreoServicio> log)
    {
        _config = config;
        _log = log;
    }

    public async Task<bool> EnviarCodigoAsync(string destino, string nombre, string codigo)
    {
        var host = _config["Correo:Host"];
        var usuario = _config["Correo:Usuario"];
        var clave = _config["Correo:Clave"];

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(clave))
        {
            _log.LogWarning("El correo no está configurado (sección 'Correo' en appsettings.json).");
            return false;
        }

        try
        {
            var puerto = int.TryParse(_config["Correo:Puerto"], out var p) ? p : 587;
            var remitente = _config["Correo:Remitente"] ?? usuario;

            using var smtp = new SmtpClient(host, puerto)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(usuario, clave)
            };

            using var mensaje = new MailMessage
            {
                From = new MailAddress(remitente, "Juego de Tanques"),
                Subject = "Tu código de verificación",
                IsBodyHtml = true,
                Body = $@"<div style=""font-family:Arial,sans-serif"">
<h2>¡Hola, {WebUtility.HtmlEncode(nombre)}!</h2>
<p>Tu código de verificación es:</p>
<p style=""font-size:32px;font-weight:bold;letter-spacing:6px"">{codigo}</p>
<p>Vence en 10 minutos. Si no fuiste tú, ignora este correo.</p>
</div>"
            };
            mensaje.To.Add(destino);

            await smtp.SendMailAsync(mensaje);
            return true;
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "No se pudo enviar el correo a {Destino}", destino);
            return false;
        }
    }
}