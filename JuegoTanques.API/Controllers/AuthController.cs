using JuegoTanques.Dominio.DTO;
using JuegoTanques.Dominio.DTO;
using Microsoft.AspNetCore.Mvc;

namespace JuegoTanques.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        // Lista temporal en memoria para simular usuarios registrados (puedes cambiarlo por tu DbContext luego)
        private static List<string> usuariosRegistrados = new List<string> { "evans", "admin", "test" };

        [HttpPost("Login")]
        public IActionResult Login([FromBody] LoginSolicitudDto credenciales)
        {
            return Ok(new
            {
                error = (string)null,
                data = new
                {
                    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummytoken",
                    idUsuario = 1,
                    nombre = credenciales.Correo,
                    rol = "Cliente"
                }
            });
        }

        [HttpPost("Registrar")]
        public IActionResult Registrar([FromBody] RegistroUsuarioDto datos)
        {
            // 1. Validamos si el nombre de usuario ya existe en nuestra "base de datos"
            if (usuariosRegistrados.Contains(datos.Nombre.ToLower()))
            {
                // Si ya existe, armamos las sugerencias automáticas
                var sugerencias = new List<string>
                {
                    $"{datos.Nombre}_123",
                    $"{datos.Nombre}.tank",
                    $"Player_{datos.Nombre}",
                    $"{datos.Nombre}{new Random().Next(10, 99)}"
                };

                return BadRequest(new
                {
                    error = "El nombre de usuario ya se encuentra registrado.",
                    sugerencias = sugerencias
                });
            }

            // 2. Si no existe, simulamos que lo guardamos
            usuariosRegistrados.Add(datos.Nombre.ToLower());

            // 3. Generamos el código OTP (en un sistema real aquí iría el código de correo)
            string codigoOtpFicticio = "123456";

            return Ok(new
            {
                error = (string)null,
                data = new
                {
                    mensaje = $"Cuenta creada con éxito. Código enviado a {datos.Correo}",
                    codigoDesarrollo = codigoOtpFicticio // 👈 Esto hace que aparezca el código en Ionic para probar de una
                }
            });
        }

        [HttpPost("VerificarCorreo")]
        public IActionResult VerificarCorreo([FromBody] VerificarCorreoDto datos)
        {
            return Ok(new
            {
                error = (string)null,
                data = new
                {
                    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummytoken",
                    idUsuario = 1,
                    nombre = "Usuario Verificado",
                    rol = "Cliente"
                }
            });
        }

        [HttpPost("ReenviarCodigo")]
        public IActionResult ReenviarCodigo([FromBody] ReenviarCodigoDto datos)
        {
            return Ok(new
            {
                error = (string)null,
                data = "Se ha enviado un nuevo código de verificación."
            });
        }
    }
}