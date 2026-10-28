using System.Security.Claims;
using JuegoTanques.API.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JuegoTanques.API.Controllers
{
    // Datos reales para inicio, perfil, tienda, ranking y resultados de partidas.
    // Todo requiere sesión: el usuario sale del token JWT, no se manda por la URL.
    [ApiController]
    [Authorize]
    [Route("api")]
    public class JuegoController : ControllerBase
    {
        private readonly JuegoServicio _juego;
        private readonly ProgresoServicio _progreso;

        public JuegoController(JuegoServicio juego, ProgresoServicio progreso)
        {
            _juego = juego;
            _progreso = progreso;
        }

        private int UsuarioId =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        // ----- Jugador -----
        [HttpGet("Jugador/Resumen")]
        public async Task<IActionResult> Resumen()
            => Responder(await _juego.ObtenerResumenAsync(UsuarioId));

        [HttpGet("Jugador/Inventario")]
        public async Task<IActionResult> Inventario()
            => Responder(await _juego.ObtenerInventarioAsync(UsuarioId));

        [HttpGet("Jugador/Presets")]
        public async Task<IActionResult> Presets()
            => Responder(await _juego.ObtenerPresetsAsync(UsuarioId));

        [HttpPost("Jugador/Presets")]
        public async Task<IActionResult> GuardarPreset([FromBody] GuardarPresetSolicitud datos)
            => Responder(await _juego.GuardarPresetAsync(UsuarioId, datos));

        [HttpPut("Jugador/Presets/{presetId:int}/Activar")]
        public async Task<IActionResult> ActivarPreset(int presetId)
            => Responder(await _juego.ActivarPresetAsync(UsuarioId, presetId));

        [HttpPut("Jugador/Equipar")]
        public async Task<IActionResult> Equipar([FromBody] EquiparSolicitud datos)
            => Responder(await _juego.EquiparAsync(UsuarioId, datos));

        // ----- Catálogo y tienda -----
        [HttpGet("Catalogo")]
        public async Task<IActionResult> Catalogo()
            => Responder(await _juego.ObtenerCatalogoAsync());

        [HttpPost("Tienda/Comprar")]
        public async Task<IActionResult> Comprar([FromBody] CompraSolicitud datos)
            => Responder(await _juego.ComprarAsync(UsuarioId, datos));

        // ----- Ranking -----
        [HttpGet("Ranking")]
        public async Task<IActionResult> Ranking()
            => Responder(await _juego.ObtenerRankingAsync());

        // ----- Resultado de una partida offline (XP) -----
        [HttpPost("Partida/FinalizarOffline")]
        public async Task<IActionResult> FinalizarOffline([FromBody] FinalizarOfflineSolicitud datos)
            => Responder(await _progreso.FinalizarOfflineAsync(UsuarioId, datos));

        // Misma forma de respuesta que el login: { error, data }
        private IActionResult Responder<T>(ResultadoAuth<T> resultado)
        {
            if (resultado.Exito)
                return Ok(new { error = (string?)null, data = resultado.Datos });

            return BadRequest(new { error = resultado.Error });
        }
    }
}