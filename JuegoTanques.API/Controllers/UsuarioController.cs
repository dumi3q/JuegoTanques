using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Dominio.InterfacesLN;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

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
    }
}