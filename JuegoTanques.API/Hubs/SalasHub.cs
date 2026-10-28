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

        // ----- Lobby -----
        public Task<List<SalaResumenDto>> ListarSalas() => Task.FromResult(_salas.Listar());

        public async Task<object> CrearSala(CrearSalaSolicitud datos)
        {
            var respuesta = await _salas.CrearAsync(Context.ConnectionId, UsuarioId, Nombre, datos);

            // 🟢 Extraemos la sala y su código real de la respuesta
            if (respuesta != null && respuesta.Sala != null)
            {
                var codigoSala = respuesta.Sala.Codigo;
                await Groups.AddToGroupAsync(Context.ConnectionId, codigoSala);
                await Clients.All.SendAsync("ListaSalasActualizada", _salas.Listar());
            }

            return respuesta;
        }

        public async Task<object> UnirseSala(string codigo, int? presetId = null)
        {
            var respuesta = await _salas.UnirseAsync(Context.ConnectionId, UsuarioId, Nombre, codigo, presetId);

            if (respuesta != null && respuesta.Sala != null)
            {
                var codigoSala = respuesta.Sala.Codigo;
                await Groups.AddToGroupAsync(Context.ConnectionId, codigoSala);
                await Clients.Group(codigoSala).SendAsync("SalaActualizada", respuesta.Sala);
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

        public Task<string?> IniciarPartida()
      => _salas.IniciarAsync(Context.ConnectionId, UsuarioId);

        // ----- Partida -----
        public async Task EstoyListo()
        {
            await _salas.MarcarListoAsync(Context.ConnectionId);
            var codigo = _salas.CodigoDe(Context.ConnectionId);

            if (codigo != null)
            {
                // Notificamos al grupo de la sala que el jugador cambió su estado de listo
                await Clients.Group(codigo).SendAsync("SalasCambiaron");
            }
        }

        public Task ReportarMuerte(int killerUsuarioId)
            => _salas.ReportarMuerteAsync(Context.ConnectionId, killerUsuarioId);

        public Task EnviarEstado(EstadoJugadorMsg estado)
        {
            var codigo = _salas.CodigoDe(Context.ConnectionId);
            return codigo is null
                ? Task.CompletedTask
                : Clients.OthersInGroup(codigo).SendAsync("EstadoRemoto", estado with { UsuarioId = UsuarioId });
        }

        public Task EnviarDisparo(DisparoMsg disparo)
        {
            var codigo = _salas.CodigoDe(Context.ConnectionId);
            return codigo is null
                ? Task.CompletedTask
                : Clients.OthersInGroup(codigo).SendAsync("DisparoRemoto", disparo with { UsuarioId = UsuarioId });
        }

        public Task LanzarZona(ZonaMsg zona)
        {
            var codigo = _salas.CodigoDe(Context.ConnectionId);
            return codigo is null
                ? Task.CompletedTask
                : Clients.OthersInGroup(codigo).SendAsync("ZonaRemota", zona with { UsuarioId = UsuarioId });
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await _salas.SalirAsync(Context.ConnectionId);
            await Clients.All.SendAsync("ListaSalasActualizada", _salas.Listar());
            await base.OnDisconnectedAsync(exception);
        }
    }
}