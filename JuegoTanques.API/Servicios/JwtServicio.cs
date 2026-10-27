using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace JuegoTanques.API.Servicios;

public class JwtServicio
{
    private readonly IConfiguration _config;

    public JwtServicio(IConfiguration config)
    {
        _config = config;
    }

    public string Generar(int usuarioId, string username, string rol)
    {
        var clave = _config["Jwt:Clave"]
            ?? throw new InvalidOperationException("Falta 'Jwt:Clave' en appsettings.json");
        var horas = int.TryParse(_config["Jwt:HorasValidez"], out var h) ? h : 72;

        var llave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(clave));

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuarioId.ToString()),
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, rol)
            }),
            Expires = DateTime.UtcNow.AddHours(horas),
            Issuer = _config["Jwt:Emisor"],
            Audience = _config["Jwt:Audiencia"],
            SigningCredentials = new SigningCredentials(llave, SecurityAlgorithms.HmacSha256)
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}