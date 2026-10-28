using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Dominio.InterfacesLN;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace JuegoTanques.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuarioController : ControllerBase
    {
        private readonly IUsuarioLN _ln;

        public UsuarioController(IUsuarioLN ln)
        {
            _ln = ln;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var respuesta = await _ln.ListarAsync();
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpGet("{usuarioId:int}")]
        public async Task<IActionResult> ObtenerPorId(int usuarioId)
        {
            var respuesta = await _ln.ObtenerPorIdAsync(usuarioId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] TUsuario modelo)
        {
            var respuesta = await _ln.InsertarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpPut]
        public async Task<IActionResult> Modificar([FromBody] TUsuario modelo)
        {
            var respuesta = await _ln.ModificarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpDelete("{usuarioId:int}")]
        public async Task<IActionResult> Eliminar(int usuarioId)
        {
            var respuesta = await _ln.EliminarAsync(usuarioId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }

        // 🟢 DTO Único
        public class ActualizarFotoDto
        {
            public string FotoBase64 { get; set; }
        }
        [HttpPut("ActualizarFoto")]
        [Authorize]
        public async Task<IActionResult> ActualizarFoto([FromBody] ActualizarFotoDto modelo)
        {
            try
            {
                var usuarioIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(usuarioIdClaim))
                {
                    return Unauthorized(new { error = "Token inválido o usuario no identificado." });
                }

                int usuarioId = int.Parse(usuarioIdClaim);
                var respuesta = await _ln.ActualizarFotoPerfilAsync(usuarioId, modelo.FotoBase64);

                // 🟢 Envuelto para que JuegoStore lo lea perfectamente en el formato IRespuesta
                return respuesta.Success
                    ? Ok(new { error = (string?)null, data = true })
                    : BadRequest(new { error = respuesta.Error });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Error interno al actualizar la foto de perfil", detalle = ex.Message });
            }
        }
    }
}