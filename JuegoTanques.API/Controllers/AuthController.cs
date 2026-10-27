using JuegoTanques.API.Servicios;
using JuegoTanques.Dominio.DTO;
using Microsoft.AspNetCore.Mvc;

namespace JuegoTanques.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AuthServicio _auth;

        public AuthController(AuthServicio auth)
        {
            _auth = auth;
        }

        [HttpPost("Login")]
        public async Task<IActionResult> Login([FromBody] LoginSolicitudDto datos)
            => Responder(await _auth.LoginAsync(datos), StatusCodes.Status401Unauthorized);

        [HttpPost("Registrar")]
        public async Task<IActionResult> Registrar([FromBody] RegistroUsuarioDto datos)
            => Responder(await _auth.RegistrarAsync(datos));

        [HttpPost("VerificarCorreo")]
        public async Task<IActionResult> VerificarCorreo([FromBody] VerificarCorreoDto datos)
            => Responder(await _auth.VerificarCorreoAsync(datos));

        [HttpPost("ReenviarCodigo")]
        public async Task<IActionResult> ReenviarCodigo([FromBody] ReenviarCodigoDto datos)
            => Responder(await _auth.ReenviarCodigoAsync(datos));

        // Todas las respuestas tienen la forma { error, data } que espera el front.
        // Si hay error, también puede venir { sugerencias } con nombres libres.
        private IActionResult Responder<T>(ResultadoAuth<T> resultado, int codigoError = StatusCodes.Status400BadRequest)
        {
            if (resultado.Exito)
                return Ok(new { error = (string?)null, data = resultado.Datos });

            return StatusCode(codigoError, new { error = resultado.Error, sugerencias = resultado.Sugerencias });
        }
    }
}