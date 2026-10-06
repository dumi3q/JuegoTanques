using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Dominio.InterfacesLN;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace JuegoTanques.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DetallePartidaJugadorController : ControllerBase
    {
        private readonly IDetallePartidaJugadorLN _ln;

        public DetallePartidaJugadorController(IDetallePartidaJugadorLN ln)
        {
            _ln = ln;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var respuesta = await _ln.ListarAsync();
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpGet("{detalleId:int}")]
        public async Task<IActionResult> ObtenerPorId(int detalleId)
        {
            var respuesta = await _ln.ObtenerPorIdAsync(detalleId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] TDetallePartidaJugador modelo)
        {
            var respuesta = await _ln.InsertarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpPut]
        public async Task<IActionResult> Modificar([FromBody] TDetallePartidaJugador modelo)
        {
            var respuesta = await _ln.ModificarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpDelete("{detalleId:int}")]
        public async Task<IActionResult> Eliminar(int detalleId)
        {
            var respuesta = await _ln.EliminarAsync(detalleId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }
    }
}