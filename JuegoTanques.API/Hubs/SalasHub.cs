using System.Security.Claims;
using JuegoTanques.API.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace JuegoTanques.API.Hubs
{
    [Authorize]
    public class SalasHub : Hub
    {
        private readonly SalasServicio _salas;

        public SalasHub(SalasServicio salas)
        {
            _salas = salas;
        }

        private int UsuarioId =>
            int.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        private string Nombre => Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Jugador";

        // Identidad autoritativa para la pantalla online. Primero consulta al miembro
        // enlazado a la conexión actual en la sala, luego recurre al claim del token.
        public int ObtenerMiUsuarioId()
        {
            var usuarioIdSala = _salas.UsuarioIdDe(Context.ConnectionId);
            return usuarioIdSala ?? UsuarioId;
        }

        // ----- Lobby -----
        public Task<List<SalaResumenDto>> ListarSalas() => Task.FromResult(_salas.Listar());

        public async Task<object> CrearSala(CrearSalaSolicitud datos)
        {
            var respuesta = await _salas.CrearAsync(Context.ConnectionId, UsuarioId, Nombre, datos);

            // 🟢 Extraemos la sala y su código real de la respuesta
            if (respuesta != null && respuesta.Sala != null)
            {
                await Clients.All.SendAsync("ListaSalasActualizada", _salas.Listar());
            }

            return respuesta;
        }

        public async Task<object> UnirseSala(string codigo, int? presetId = null)
        {
            var respuesta = await _salas.UnirseAsync(Context.ConnectionId, UsuarioId, Nombre, codigo, presetId);

            if (respuesta != null && respuesta.Sala != null)
            {
                await Clients.All.SendAsync("ListaSalasActualizada", _salas.Listar());
            }

            return respuesta;
        }

        public async Task SalirSala()
        {
            var codigo = _salas.CodigoDe(Context.ConnectionId);
            await _salas.SalirAsync(Context.ConnectionId);

            if (codigo != null)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, codigo);
            }

            await Clients.All.SendAsync("ListaSalasActualizada", _salas.Listar());
        }

        public Task<string?> CambiarColor(string color) => Task.FromResult<string?>(null);

        public async Task<string?> IniciarPartida()
        {
            // Compatibilidad; la UI inicia automáticamente cuando todos estén listos.
            return await _salas.IniciarAsync(Context.ConnectionId, UsuarioId);
        }

        // ----- Partida -----
        public async Task EstoyListo()
        {
            var error = await _salas.MarcarListoAsync(Context.ConnectionId);
            if (error != null) throw new HubException(error);
        }

        public Task EnviarEstado(EstadoJugadorMsg estado)
            => _salas.ActualizarEstadoAsync(Context.ConnectionId, estado);

        public async Task EnviarDisparo(DisparoMsg disparo)
        {
            var publicado = disparo with { UsuarioId = UsuarioId };
            var registrado = await _salas.RegistrarDisparoAsync(Context.ConnectionId, publicado);
            if (!registrado) return;
        }

        public Task<ResultadoImpactoDto> RegistrarImpacto(string balaId)
            => _salas.RegistrarImpactoAsync(Context.ConnectionId, balaId);

        public Task<List<PowerUpOnlineDto>> ListarPowerUps()
            => Task.FromResult(_salas.ListarPowerUps(Context.ConnectionId));

        public Task<bool> CrearPowerUp(PowerUpOnlineDto item)
            => _salas.CrearPowerUpAsync(Context.ConnectionId, item);

        public Task<bool> RecogerPowerUp(string id)
            => _salas.RecogerPowerUpAsync(Context.ConnectionId, id);

        public Task LanzarZona(ZonaMsg zona)
            => _salas.LanzarZonaVenenoAsync(Context.ConnectionId, zona);

        public Task<ResultadoImpactoDto> AplicarVeneno(int atacanteUsuarioId)
            => _salas.AplicarVenenoAsync(Context.ConnectionId, atacanteUsuarioId);

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await _salas.SalirAsync(Context.ConnectionId);
            await Clients.All.SendAsync("ListaSalasActualizada", _salas.Listar());
            await base.OnDisconnectedAsync(exception);
        }
    }
}
