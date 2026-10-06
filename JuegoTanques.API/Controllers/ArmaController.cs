using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Dominio.InterfacesLN;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace JuegoTanques.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArmaController : ControllerBase
    {
        private readonly IArmaLN _ln;

        public ArmaController(IArmaLN ln)
        {
            _ln = ln;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var respuesta = await _ln.ListarAsync();
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpGet("{armaId:int}")]
        public async Task<IActionResult> ObtenerPorId(int armaId)
        {
            var respuesta = await _ln.ObtenerPorIdAsync(armaId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] TArma modelo)
        {
            var respuesta = await _ln.InsertarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpPut]
        public async Task<IActionResult> Modificar([FromBody] TArma modelo)
        {
            var respuesta = await _ln.ModificarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpDelete("{armaId:int}")]
        public async Task<IActionResult> Eliminar(int armaId)
        {
            var respuesta = await _ln.EliminarAsync(armaId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }
    }
}