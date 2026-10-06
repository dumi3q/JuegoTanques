using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Dominio.InterfacesLN;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace JuegoTanques.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EquipamientosPreguardadosController : ControllerBase
    {
        private readonly IEquipamentosPreguardadosLN _ln;

        public EquipamientosPreguardadosController(IEquipamentosPreguardadosLN ln)
        {
            _ln = ln;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var respuesta = await _ln.ListarAsync();
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpGet("{presetId:int}")]
        public async Task<IActionResult> ObtenerPorId(int presetId)
        {
            var respuesta = await _ln.ObtenerPorIdAsync(presetId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] TEquipamientosPreguardados modelo)
        {
            var respuesta = await _ln.InsertarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpPut]
        public async Task<IActionResult> Modificar([FromBody] TEquipamientosPreguardados modelo)
        {
            var respuesta = await _ln.ModificarAsync(modelo);
            return respuesta.Success ? Ok(respuesta.Data) : BadRequest(respuesta.Error);
        }

        [HttpDelete("{presetId:int}")]
        public async Task<IActionResult> Eliminar(int presetId)
        {
            var respuesta = await _ln.EliminarAsync(presetId);
            return respuesta.Success ? Ok(respuesta.Data) : NotFound(respuesta.Error);
        }
    }
}