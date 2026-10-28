using System.Collections.Concurrent;
using JuegoTanques.AccesoDatos.Contexto;
using JuegoTanques.API.Hubs;
using JuegoTanques.Dominio.Entidades;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace JuegoTanques.API.Servicios;

// ================= Datos que viajan hacia los jugadores =================
public record JugadorSalaDto(int UsuarioId, string Nombre, int Slot, int TanqueId, int ArmaId,
                           string Color, bool EsHost, int RondasGanadas, int Vidas, string FotoPerfil, bool listo);

public record SalaDetalleDto(string Codigo, string Nombre, string MapaId, int Rondas, int Vidas,
                           int JugadoresMaximos, bool Privada, bool EnPartida, int HostUsuarioId,
                           List<JugadorSalaDto> Jugadores);

public record SalaResumenDto(string Codigo, string Nombre, string MapaId, int Rondas, int Vidas,
                           int JugadoresActuales, int JugadoresMaximos, bool Privada, string HostNombre);

public record RespuestaSala(SalaDetalleDto? Sala, string? Error)
{
    public static RespuestaSala Ok(SalaDetalleDto sala) => new(sala, null);
    public static RespuestaSala Fallo(string error) => new(null, error);
}

// ================= Datos que mandan los jugadores =================
public record CrearSalaSolicitud(string? Nombre, string? MapaId, int Rondas, int Vidas,
                                 int JugadoresMaximos, bool Privada, string? CodigoPersonalizado, int? PresetId);

public record EstadoJugadorMsg(int UsuarioId, double X, double Y, double Angulo, double Torreta, int Hp);
public record DisparoMsg(int UsuarioId, double X, double Y, double Angulo, string ArmaId, bool Perforante);
public record ZonaMsg(int UsuarioId, double X, double Y, double Radio, int Ms);

// ================= Estado interno de una sala =================
public class JugadorEnSala
{
    public string ConexionId { get; set; } = "";
    public int UsuarioId { get; set; }
    public string Nombre { get; set; } = "";
    public int Slot { get; set; }
    public int TanqueId { get; set; }
    public int ArmaId { get; set; }
    public string Color { get; set; } = "";
    public int Vidas { get; set; }
    public int Kills { get; set; }
    public int RondasGanadas { get; set; }
    public bool Listo { get; set; }
    public string FotoPerfil { get; set; } = "";
}

public class Sala
{
    public readonly object Candado = new();
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string MapaId { get; set; } = "aleatorio";
    public string MapaResuelto { get; set; } = "mapa_1";
    public int Rondas { get; set; } = 3;
    public int Vidas { get; set; } = 3;
    public int Maximo { get; set; } = 4;
    public bool Privada { get; set; }
    public int HostUsuarioId { get; set; }
    public bool EnPartida { get; set; }
    public bool RondaEnCurso { get; set; }
    public int RondaActual { get; set; }
    public DateTime InicioPartida { get; set; }
    public CancellationTokenSource? TimerRonda { get; set; }
    public List<JugadorEnSala> Jugadores { get; } = new();
}

public record Equipo(int TanqueId, int ArmaId);

public class SalasServicio
{
    private static readonly string[] Colores = { "#00d2ff", "#ff4d6d", "#2ecc71", "#ffc409" };
    private static readonly string[] Mapas = { "mapa_1", "mapa_2", "mapa_3" };

    private const int SegundosRonda = 90;
    private const int PausaEntreRondasMs = 4000;
    private const int EsperaListosMs = 8000;

    private readonly ConcurrentDictionary<string, Sala> _salas = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, string> _conexionASala = new();
    private readonly IHubContext<SalasHub> _hub;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<SalasServicio> _log;

    public SalasServicio(IHubContext<SalasHub> hub, IServiceScopeFactory scopes, ILogger<SalasServicio> log)
    {
        _hub = hub;
        _scopes = scopes;
        _log = log;
    }

    public string? CodigoDe(string conexionId) =>
        _conexionASala.TryGetValue(conexionId, out var codigo) ? codigo : null;

    private Sala? SalaDe(string conexionId) =>
        _conexionASala.TryGetValue(conexionId, out var codigo) && _salas.TryGetValue(codigo, out var sala) ? sala : null;

    // =====================================================
    //  LISTA DE SALAS PÚBLICAS
    // =====================================================
    public List<SalaResumenDto> Listar()
    {
        var lista = new List<SalaResumenDto>();
        foreach (var s in _salas.Values)
        {
            lock (s.Candado)
            {
                if (s.Privada || s.EnPartida) continue;
                var host = s.Jugadores.FirstOrDefault(j => j.UsuarioId == s.HostUsuarioId)?.Nombre ?? "";
                lista.Add(new SalaResumenDto(s.Codigo, s.Nombre, s.MapaId, s.Rondas, s.Vidas,
                    s.Jugadores.Count, s.Maximo, s.Privada, host));
            }
        }
        return lista.OrderBy(s => s.Nombre).ToList();
    }

    // =====================================================
    //  CREAR / UNIRSE / SALIR
    // =====================================================
    public async Task<RespuestaSala> CrearAsync(string conexionId, int usuarioId, string usuario, CrearSalaSolicitud datos)
    {
        await SalirAsync(conexionId);

        var (equipo, fotoPerfil) = await ObtenerEquipoYPerfilAsync(usuarioId, datos.PresetId);
        if (equipo is null)
            return RespuestaSala.Fallo("No tienes un equipo válido. Revisa tus presets.");

        var nombre = (datos.Nombre ?? string.Empty).Trim();
        if (nombre.Length == 0) nombre = $"Sala de {usuario}";
        if (nombre.Length > 30) nombre = nombre[..30];

        var mapaId = datos.MapaId == "aleatorio" || (datos.MapaId != null && Mapas.Contains(datos.MapaId))
            ? datos.MapaId!
            : "aleatorio";

        string codigoSala = !string.IsNullOrEmpty(datos.CodigoPersonalizado)
            ? datos.CodigoPersonalizado.Trim().ToUpperInvariant()
            : GenerarCodigo();

        if (_salas.ContainsKey(codigoSala))
        {
            codigoSala = GenerarCodigo();
        }

        var sala = new Sala
        {
            Codigo = codigoSala,
            Nombre = nombre,
            MapaId = mapaId,
            Rondas = Math.Clamp(datos.Rondas, 1, 7),
            Vidas = Math.Clamp(datos.Vidas, 1, 3),
            Maximo = Math.Clamp(datos.JugadoresMaximos, 2, 4),
            Privada = datos.Privada,
            HostUsuarioId = usuarioId
        };
        sala.Jugadores.Add(NuevoJugador(conexionId, usuarioId, usuario, 0, equipo, Colores[0], fotoPerfil));

        _salas[sala.Codigo] = sala;
        _conexionASala[conexionId] = sala.Codigo;
        await _hub.Groups.AddToGroupAsync(conexionId, sala.Codigo);

        await AvisarListaAsync();

        return RespuestaSala.Ok(DetalleSeguro(sala));
    }

    public async Task<RespuestaSala> UnirseAsync(
    string conexionId, int usuarioId, string usuario, string codigo, int? presetId)
    {
        codigo = (codigo ?? string.Empty).Trim().ToUpperInvariant();

        if (codigo.Length == 0 || !_salas.TryGetValue(codigo, out var sala))
            return RespuestaSala.Fallo($"No existe una sala con ese código ('{codigo}').");

        // Si la conexión ya está en esta sala, devolver el estado en vez de expulsarla.
        var codigoActual = CodigoDe(conexionId);
        if (string.Equals(codigoActual, sala.Codigo, StringComparison.OrdinalIgnoreCase))
        {
            lock (sala.Candado)
            {
                if (sala.Jugadores.Any(j => j.ConexionId == conexionId && j.UsuarioId == usuarioId))
                    return RespuestaSala.Ok(Detalle(sala));
            }
        }

        var (equipo, fotoPerfil) = await ObtenerEquipoYPerfilAsync(usuarioId, presetId);
        if (equipo is null)
            return RespuestaSala.Fallo("No tienes un equipo válido. Revisa tus presets.");

        // Primera validación: si falla, el jugador conserva la sala en la que está.
        lock (sala.Candado)
        {
            if (sala.EnPartida)
                return RespuestaSala.Fallo("La partida ya comenzó.");
            if (sala.Jugadores.Any(j => j.UsuarioId == usuarioId))
                return RespuestaSala.Fallo("Ya estás en esa sala desde otro dispositivo.");
            if (sala.Jugadores.Count >= sala.Maximo)
                return RespuestaSala.Fallo("La sala está llena.");
        }

        // Solo salir de la sala anterior cuando el destino existe y parece válido.
        await SalirAsync(conexionId);

        SalaDetalleDto detalle;
        lock (sala.Candado)
        {
            // Revalidar porque otra conexión pudo entrar mientras esperábamos operaciones async.
            if (sala.EnPartida)
                return RespuestaSala.Fallo("La partida ya comenzó.");
            if (sala.Jugadores.Any(j => j.UsuarioId == usuarioId))
                return RespuestaSala.Fallo("Ya estás en esa sala desde otro dispositivo.");
            if (sala.Jugadores.Count >= sala.Maximo)
                return RespuestaSala.Fallo("La sala está llena.");

            var slot = Enumerable.Range(0, 4).First(i => sala.Jugadores.All(j => j.Slot != i));
            var color = Colores.First(c => sala.Jugadores.All(j => j.Color != c));
            sala.Jugadores.Add(NuevoJugador(conexionId, usuarioId, usuario, slot, equipo, color, fotoPerfil));
            detalle = Detalle(sala);
        }

        _conexionASala[conexionId] = sala.Codigo;
        await _hub.Groups.AddToGroupAsync(conexionId, sala.Codigo);
        await _hub.Clients.Group(sala.Codigo).SendAsync("SalaActualizada", detalle);
        await AvisarListaAsync();

        return RespuestaSala.Ok(detalle);
    }
    public async Task SalirAsync(string conexionId)
    {
        if (!_conexionASala.TryRemove(conexionId, out var codigo)) return;
        if (!_salas.TryGetValue(codigo, out var sala)) return;

        await _hub.Groups.RemoveFromGroupAsync(conexionId, codigo);

        var vacia = false;
        var terminarPartida = false;
        var terminarRonda = false;
        int? ganador = null;
        int usuarioQueSalio;
        SalaDetalleDto? detalle = null;

        lock (sala.Candado)
        {
            var jugador = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (jugador is null) return;

            sala.Jugadores.Remove(jugador);
            usuarioQueSalio = jugador.UsuarioId;

            if (sala.Jugadores.Count == 0)
            {
                vacia = true;
            }
            else
            {
                if (sala.HostUsuarioId == jugador.UsuarioId)
                    sala.HostUsuarioId = sala.Jugadores[0].UsuarioId;

                if (sala.EnPartida)
                {
                    if (sala.Jugadores.Count < 2)
                    {
                        terminarPartida = true;
                    }
                    else if (sala.RondaEnCurso)
                    {
                        var vivos = sala.Jugadores.Where(j => j.Vidas > 0).ToList();
                        if (vivos.Count <= 1)
                        {
                            terminarRonda = true;
                            ganador = vivos.Count == 1 ? vivos[0].UsuarioId : null;
                        }
                    }
                }
                detalle = Detalle(sala);
            }
        }

        if (vacia)
        {
            sala.TimerRonda?.Cancel();
            _salas.TryRemove(codigo, out _);
            await AvisarListaAsync();
            return;
        }

        await _hub.Clients.Group(codigo).SendAsync("JugadorSalio", usuarioQueSalio);
        if (detalle != null)
            await _hub.Clients.Group(codigo).SendAsync("SalaActualizada", detalle);

        if (terminarPartida) await FinalizarPartidaAsync(sala);
        else if (terminarRonda) await TerminarRondaAsync(sala, ganador, "abandono");

        await AvisarListaAsync();
    }

    // =====================================================
    //  PARTIDA Y RONDAS
    // =====================================================
    public async Task<string?> IniciarAsync(string conexionId, int usuarioId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return "No estás en una sala.";

        SalaDetalleDto detalle;
        lock (sala.Candado)
        {
            if (sala.HostUsuarioId != usuarioId) return "Solo el anfitrión puede iniciar la partida.";
            if (sala.EnPartida) return "La partida ya empezó.";
            if (sala.Jugadores.Count < 2) return "Necesitas al menos 2 jugadores.";

            sala.EnPartida = true;
            sala.RondaEnCurso = false;
            sala.RondaActual = 0;
            sala.InicioPartida = DateTime.UtcNow;
            sala.MapaResuelto = sala.MapaId == "aleatorio" ? Mapas[Random.Shared.Next(Mapas.Length)] : sala.MapaId;

            foreach (var j in sala.Jugadores)
            {
                j.Vidas = sala.Vidas;
                j.Kills = 0;
                j.RondasGanadas = 0;
                j.Listo = false;
            }
            detalle = Detalle(sala);
        }

        await _hub.Clients.Group(sala.Codigo).SendAsync("PartidaIniciada", detalle);
        await AvisarListaAsync();

        _ = Task.Run(() => EsperarListosYEmpezarAsync(sala));
        return null;
    }

    public async Task MarcarListoAsync(string conexionId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return;

        lock (sala.Candado)
        {
            var jugador = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (jugador is null) return;
            jugador.Listo = true;
        }

        await _hub.Clients.Group(sala.Codigo)
            .SendAsync("SalaActualizada", DetalleSeguro(sala));
    }

    public async Task ReportarMuerteAsync(string conexionId, int killerUsuarioId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return;

        int victimaId;
        int vidasRestantes;
        bool terminar;
        int? ganador;

        lock (sala.Candado)
        {
            if (!sala.RondaEnCurso) return;

            var victima = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (victima is null || victima.Vidas <= 0) return;

            victima.Vidas--;
            victimaId = victima.UsuarioId;
            vidasRestantes = victima.Vidas;

            if (killerUsuarioId != victimaId)
            {
                var asesino = sala.Jugadores.FirstOrDefault(j => j.UsuarioId == killerUsuarioId);
                if (asesino != null) asesino.Kills++;
            }

            var vivos = sala.Jugadores.Where(j => j.Vidas > 0).ToList();
            terminar = vivos.Count <= 1;
            ganador = vivos.Count == 1 ? vivos[0].UsuarioId : null;
        }

        await _hub.Clients.Group(sala.Codigo).SendAsync("JugadorMurio",
            new { usuarioId = victimaId, killerId = killerUsuarioId, vidasRestantes });

        if (terminar) await TerminarRondaAsync(sala, ganador, "eliminacion");
    }

    private async Task EsperarListosYEmpezarAsync(Sala sala)
    {
        var limite = DateTime.UtcNow.AddMilliseconds(EsperaListosMs);
        while (DateTime.UtcNow < limite)
        {
            bool todos;
            lock (sala.Candado)
            {
                if (!sala.EnPartida) return;
                todos = sala.Jugadores.All(j => j.Listo);
            }
            if (todos) break;
            await Task.Delay(200);
        }
        await IniciarRondaAsync(sala);
    }

    private async Task IniciarRondaAsync(Sala sala)
    {
        int ronda;
        CancellationTokenSource cts;

        lock (sala.Candado)
        {
            if (!sala.EnPartida || sala.RondaEnCurso || sala.Jugadores.Count < 2) return;

            sala.RondaActual++;
            sala.RondaEnCurso = true;
            foreach (var j in sala.Jugadores) j.Vidas = sala.Vidas;

            sala.TimerRonda?.Cancel();
            cts = new CancellationTokenSource();
            sala.TimerRonda = cts;
            ronda = sala.RondaActual;
        }

        await _hub.Clients.Group(sala.Codigo).SendAsync("RondaIniciada",
            new { ronda, segundos = SegundosRonda, vidas = sala.Vidas });

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(SegundosRonda * 1000, cts.Token);
                await TerminarRondaAsync(sala, null, "tiempo");
            }
            catch (OperationCanceledException) { }
        });
    }

    private async Task TerminarRondaAsync(Sala sala, int? ganadorId, string motivo)
    {
        int ronda;
        bool fin;
        List<object> marcador;

        lock (sala.Candado)
        {
            if (!sala.RondaEnCurso) return;

            sala.RondaEnCurso = false;
            sala.TimerRonda?.Cancel();

            if (ganadorId.HasValue)
            {
                var g = sala.Jugadores.FirstOrDefault(j => j.UsuarioId == ganadorId.Value);
                if (g != null) g.RondasGanadas++;
            }

            ronda = sala.RondaActual;
            var requeridas = (sala.Rondas + 1) / 2;
            fin = sala.Jugadores.Any(j => j.RondasGanadas >= requeridas) || ronda >= sala.Rondas;

            marcador = sala.Jugadores
                .Select(j => (object)new { usuarioId = j.UsuarioId, rondasGanadas = j.RondasGanadas, kills = j.Kills })
                .ToList();
        }

        await _hub.Clients.Group(sala.Codigo).SendAsync("RondaTerminada",
            new { ronda, ganadorId, motivo, marcador, esFinal = fin });

        if (fin)
        {
            await Task.Delay(2500);
            await FinalizarPartidaAsync(sala);
            return;
        }

        await Task.Delay(PausaEntreRondasMs);
        await IniciarRondaAsync(sala);
    }

    private async Task FinalizarPartidaAsync(Sala sala)
    {
        List<JugadorEnSala> orden;
        DateTime inicio;

        lock (sala.Candado)
        {
            if (!sala.EnPartida) return;

            sala.EnPartida = false;
            sala.RondaEnCurso = false;
            sala.TimerRonda?.Cancel();

            orden = sala.Jugadores
                .OrderByDescending(j => j.RondasGanadas)
                .ThenByDescending(j => j.Kills)
                .ThenByDescending(j => j.Vidas)
                .ToList();
            inicio = sala.InicioPartida;
        }

        var duracion = (int)(DateTime.UtcNow - inicio).TotalSeconds;
        var entradas = orden
            .Select((j, i) => new ResultadoOnlineEntrada(j.UsuarioId, i + 1, j.Kills, j.RondasGanadas))
            .ToList();

        List<ResultadoOnlineSalida> salidas;
        try
        {
            using var scope = _scopes.CreateScope();
            var progreso = scope.ServiceProvider.GetRequiredService<ProgresoServicio>();
            salidas = await progreso.FinalizarOnlineAsync(entradas, duracion);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "No se pudieron guardar los resultados de la sala {Codigo}", sala.Codigo);
            salidas = new List<ResultadoOnlineSalida>();
        }

        var posiciones = orden.Select((j, i) =>
        {
            var s = salidas.FirstOrDefault(x => x.UsuarioId == j.UsuarioId);
            return new
            {
                usuarioId = j.UsuarioId,
                nombre = j.Nombre,
                posicion = i + 1,
                rondasGanadas = j.RondasGanadas,
                kills = j.Kills,
                xpGanada = s?.XpGanada ?? 0,
                monedasGanadas = s?.MonedasGanadas ?? 0,
                nivel = s?.Nivel ?? 1,
                subioNivel = s?.SubioNivel ?? false
            };
        }).ToList();

        await _hub.Clients.Group(sala.Codigo).SendAsync("PartidaTerminada", new { posiciones });

        lock (sala.Candado)
        {
            foreach (var j in sala.Jugadores) j.Listo = false;
        }
        await _hub.Clients.Group(sala.Codigo).SendAsync("SalaActualizada", DetalleSeguro(sala));
        await AvisarListaAsync();
    }

    // =====================================================
    //  Ayudas internas
    // =====================================================
    private Task AvisarListaAsync() => _hub.Clients.All.SendAsync("SalasCambiaron");

    private string GenerarCodigo()
    {
        string codigo;
        do { codigo = $"TANK-{Random.Shared.Next(1000, 10000)}"; }
        while (_salas.ContainsKey(codigo));
        return codigo;
    }

    private static JugadorEnSala NuevoJugador(string conexionId, int usuarioId, string nombre, int slot, Equipo equipo, string color, string fotoPerfil) => new()
    {
        ConexionId = conexionId,
        UsuarioId = usuarioId,
        Nombre = nombre,
        Slot = slot,
        TanqueId = equipo.TanqueId,
        ArmaId = equipo.ArmaId,
        Color = color,
        FotoPerfil = fotoPerfil
    };

    private SalaDetalleDto DetalleSeguro(Sala sala)
    {
        lock (sala.Candado) { return Detalle(sala); }
    }

    private static SalaDetalleDto Detalle(Sala s) => new(
        s.Codigo, s.Nombre,
        s.EnPartida ? s.MapaResuelto : s.MapaId,
        s.Rondas, s.Vidas, s.Maximo, s.Privada, s.EnPartida, s.HostUsuarioId,
        s.Jugadores.OrderBy(j => j.Slot)
            .Select(j => new JugadorSalaDto(j.UsuarioId, j.Nombre, j.Slot, j.TanqueId, j.ArmaId,
                j.Color, j.UsuarioId == s.HostUsuarioId, j.RondasGanadas, j.Vidas, j.FotoPerfil, j.Listo))
            .ToList());

    private async Task<(Equipo? Equipo, string FotoPerfil)> ObtenerEquipoYPerfilAsync(int usuarioId, int? presetId)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<JuegoTanquesContext>();

        var usuario = await db.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.UsuarioId == usuarioId);
        string fotoPerfil = usuario?.FotoPerfil ?? "assets/imgs/default-avatar.png";

        var presets = db.EquipamientosPreguardados.AsNoTracking().Where(p => p.UsuarioId == usuarioId);

        EquipamientosPreguardados? elegido = null;
        if (presetId.HasValue)
            elegido = await presets.FirstOrDefaultAsync(p => p.PresetId == presetId.Value);

        if (elegido is null)
            elegido = await presets.Where(p => p.EsActivo == true).FirstOrDefaultAsync();

        if (elegido is null)
            elegido = await presets.OrderBy(p => p.NumeroSlot).FirstOrDefaultAsync();

        var equipo = elegido is null ? null : new Equipo(elegido.TanqueId, elegido.ArmaId);
        return (equipo, fotoPerfil);
    }
}