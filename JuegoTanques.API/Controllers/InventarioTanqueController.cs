using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Dominio.InterfacesLN;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace JuegoTanques.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventarioTanqueController : ControllerBase
    {
        private readonly IInventarioTanqueLN _ln;

        public InventarioTanqueController(IInventarioTanqueLN ln)
        {
            _ln = ln;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var respuesta = await _ln.ListarAsync();
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        // GET api/InventarioTanque/usuario/5  -> todos los tanques del usuario 5
        [HttpGet("usuario/{usuarioId:int}")]
        public async Task<IActionResult> ListarPorUsuario(int usuarioId)
        {
            var respuesta = await _ln.ListarPorUsuarioAsync(usuarioId);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        // GET api/InventarioTanque/5/2  -> tanque 2 del usuario 5
        [HttpGet("{usuarioId:int}/{tanqueId:int}")]
        public async Task<IActionResult> ObtenerPorId(int usuarioId, int tanqueId)
        {
            var respuesta = await _ln.ObtenerPorIdAsync(usuarioId, tanqueId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] TInventarioTanque modelo)
        {
            var respuesta = await _ln.InsertarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpPut]
        public async Task<IActionResult> Modificar([FromBody] TInventarioTanque modelo)
        {
            var respuesta = await _ln.ModificarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpDelete("{usuarioId:int}/{tanqueId:int}")]
        public async Task<IActionResult> Eliminar(int usuarioId, int tanqueId)
        {
            var respuesta = await _ln.EliminarAsync(usuarioId, tanqueId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }
    }
}