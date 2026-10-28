using System.Collections.Concurrent;
using JuegoTanques.AccesoDatos.Contexto;
using JuegoTanques.API.Hubs;
using JuegoTanques.Dominio.Entidades;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace JuegoTanques.API.Servicios;

// ================= Datos que viajan hacia los jugadores =================
public record JugadorSalaDto(int UsuarioId, string Nombre, int Slot, int TanqueId, int ArmaId,
                           string Color, bool EsHost, int RondasGanadas, int Vidas, string FotoPerfil,
                           int EquipoId, int HpActual, bool Listo);

public record SalaDetalleDto(string Codigo, string Nombre, string MapaId, int Rondas, int Vidas,
                           int JugadoresMaximos, bool Privada, bool EnPartida, int HostUsuarioId,
                           bool ModoEquipos, List<JugadorSalaDto> Jugadores);

public record SalaResumenDto(string Codigo, string Nombre, string MapaId, int Rondas, int Vidas,
                           int JugadoresActuales, int JugadoresMaximos, bool Privada, string HostNombre);

public record PowerUpOnlineDto(string Id, double X, double Y, string Tipo);
public record ResultadoImpactoDto(bool Aceptado, int UsuarioId, int HpActual, int Vidas,
                                  bool Murio, bool Eliminado, string? Error = null);

public sealed class DisparoRegistrado
{
    public int UsuarioId { get; init; }
    public string ArmaId { get; init; } = "WEAP-02";
    public bool Perforante { get; init; }
    public bool Consumido { get; set; }
}

public sealed class ZonaVenenoRegistrada
{
    public int UsuarioId { get; init; }
    public double X { get; init; }
    public double Y { get; init; }
    public double Radio { get; init; } = 170;
    public DateTime ExpiraUtc { get; init; }
    public Dictionary<int, DateTime> UltimoTickVictimaUtc { get; } = new();
}

public record RespuestaSala(SalaDetalleDto? Sala, string? Error)
{
    public static RespuestaSala Ok(SalaDetalleDto sala) => new(sala, null);
    public static RespuestaSala Fallo(string error) => new(null, error);
}

// ================= Datos que mandan los jugadores =================
public record CrearSalaSolicitud(string? Nombre, string? MapaId, int Rondas, int Vidas,
                                 int JugadoresMaximos, bool Privada, string? CodigoPersonalizado, int? PresetId,
                                 bool ModoEquipos = false);

public record EstadoJugadorMsg(int UsuarioId, double X, double Y, double Angulo, double Torreta, int Hp);
public record DisparoMsg(int UsuarioId, double X, double Y, double Angulo, string ArmaId, bool Perforante, string BalaId = "");
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
    public int EquipoId { get; set; }
    public int HpActual { get; set; }
    public double X { get; set; } = 120;
    public double Y { get; set; } = 120;
    public double Angulo { get; set; }
    public double Torreta { get; set; }
    public string? EfectoActivo { get; set; }
    public DateTime EfectoHasta { get; set; }
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
    public bool ModoEquipos { get; set; }
    public int HostUsuarioId { get; set; }
    public bool EnPartida { get; set; }
    public bool RondaEnCurso { get; set; }
    public int RondaActual { get; set; }
    public DateTime InicioPartida { get; set; }
    public CancellationTokenSource? TimerRonda { get; set; }
    public List<JugadorEnSala> Jugadores { get; } = new();
    public Dictionary<string, DisparoRegistrado> Disparos { get; } = new(StringComparer.Ordinal);
    public Dictionary<string, PowerUpOnlineDto> PowerUps { get; } = new(StringComparer.Ordinal);
    public Dictionary<int, ZonaVenenoRegistrada> ZonasVeneno { get; } = new();
}

public record Equipo(int TanqueId, int ArmaId);

public class SalasServicio
{
    private static readonly string[] Colores = { "#00d2ff", "#ff4d6d", "#2ecc71", "#ffc409" };
    private static readonly string[] Mapas = { "mapa_1", "mapa_2", "mapa_3" };

    private const int SegundosRonda = 90;
    private const int PausaEntreRondasMs = 4000;

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

    // Devuelve el ID de usuario asociado a ESTA conexión de SignalR dentro de la sala.
    // Es más fiable que intentar deducirlo leyendo localStorage en el navegador.
    public int? UsuarioIdDe(string conexionId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return null;

        lock (sala.Candado)
            return sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId)?.UsuarioId;
    }

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
        var (equipo, fotoPerfil) = await ObtenerEquipoYPerfilAsync(usuarioId, datos.PresetId);
        if (equipo is null)
            return RespuestaSala.Fallo("No tienes un equipo válido. Revisa tus presets.");

        // No abandonar una sala actual hasta saber que el usuario puede crear la nueva.
        await SalirAsync(conexionId);

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
            ModoEquipos = datos.ModoEquipos,
            HostUsuarioId = usuarioId
        };
        var jugadorHost = NuevoJugador(conexionId, usuarioId, usuario, 0, equipo, Colores[0], fotoPerfil);
        jugadorHost.EquipoId = EquipoParaSlot(sala, 0);
        sala.Jugadores.Add(jugadorHost);

        _salas[sala.Codigo] = sala;
        _conexionASala[conexionId] = sala.Codigo;
        await _hub.Groups.AddToGroupAsync(conexionId, sala.Codigo);

        await AvisarListaAsync();

        return RespuestaSala.Ok(DetalleSeguro(sala));
    }

    public async Task<RespuestaSala> UnirseAsync(string conexionId, int usuarioId, string usuario, string codigo, int? presetId)
    {
        codigo = (codigo ?? string.Empty).Trim().ToUpperInvariant();
        if (codigo.Length == 0)
            return RespuestaSala.Fallo("Ingresa un código de sala válido.");

        // Validar el destino ANTES de abandonar la sala actual. Un código incorrecto no
        // debe sacar al jugador de una sala en la que ya estaba correctamente conectado.
        if (!_salas.TryGetValue(codigo, out var sala))
            return RespuestaSala.Fallo($"No existe una sala con ese código ('{codigo}').");

        // Si esta misma conexión ya pertenece a la sala solicitada, devolvemos su estado.
        lock (sala.Candado)
        {
            var actual = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (actual != null)
                return RespuestaSala.Ok(Detalle(sala));
        }

        await SalirAsync(conexionId);
        // La sala pudo cerrarse entre la primera comprobación y la salida anterior.
        if (!_salas.TryGetValue(codigo, out sala))
            return RespuestaSala.Fallo("La sala ya no está disponible.");

        _log.LogInformation("🔍 [BACKEND] Intentando unir a sala código: '{Codigo}' | Salas actuales en memoria: {Total}", codigo, _salas.Keys.Count);
        foreach (var k in _salas.Keys)
        {
            _log.LogInformation("   -> Sala disponible en _salas: '{Key}'", k);
        }

        var (equipo, fotoPerfil) = await ObtenerEquipoYPerfilAsync(usuarioId, presetId);
        if (equipo is null)
            return RespuestaSala.Fallo("No tienes un equipo válido. Revisa tus presets.");

        SalaDetalleDto detalle;
        lock (sala.Candado)
        {
            if (sala.EnPartida)
                return RespuestaSala.Fallo("La partida ya comenzó.");
            if (sala.Jugadores.Any(j => j.UsuarioId == usuarioId))
                return RespuestaSala.Fallo("Ya estás en esa sala desde otro dispositivo.");
            if (sala.Jugadores.Count >= sala.Maximo)
                return RespuestaSala.Fallo("La sala está llena.");

            var slot = Enumerable.Range(0, 4).First(i => sala.Jugadores.All(j => j.Slot != i));
            var color = Colores.First(c => sala.Jugadores.All(j => j.Color != c));
            var nuevoJugador = NuevoJugador(conexionId, usuarioId, usuario, slot, equipo, color, fotoPerfil);
            nuevoJugador.EquipoId = EquipoParaSlot(sala, slot);
            sala.Jugadores.Add(nuevoJugador);
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
                        var bandosVivos = sala.ModoEquipos
                            ? vivos.Select(j => j.EquipoId).Distinct().Count()
                            : vivos.Count;
                        if (bandosVivos <= 1)
                        {
                            terminarRonda = true;
                            ganador = vivos.FirstOrDefault()?.UsuarioId;
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

        lock (sala.Candado)
        {
            if (sala.HostUsuarioId != usuarioId)
                return "Solo el anfitrión puede solicitar el inicio.";
            if (sala.EnPartida)
                return "La partida ya empezó.";
            if (sala.Jugadores.Count < 2)
                return "Necesitas al menos 2 jugadores.";
            if (sala.Jugadores.Any(j => !j.Listo))
                return "Todos los jugadores deben estar listos.";
        }

        await EmpezarSalaSiTodosListosAsync(sala);
        return null;
    }

    // Cualquier jugador, incluido el host, puede marcarse listo/no listo.
    // La última persona que marque listo dispara el inicio, de forma atómica.
    public async Task<string?> MarcarListoAsync(string conexionId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return "No estás en una sala.";

        SalaDetalleDto detalle;
        lock (sala.Candado)
        {
            if (sala.EnPartida) return "La partida ya comenzó.";
            var jugador = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (jugador is null) return "No formas parte de esta sala.";
            jugador.Listo = !jugador.Listo;
            detalle = Detalle(sala);
        }

        await _hub.Clients.Group(sala.Codigo).SendAsync("SalaActualizada", detalle);
        await AvisarListaAsync();
        await EmpezarSalaSiTodosListosAsync(sala);
        return null;
    }

    private async Task<bool> EmpezarSalaSiTodosListosAsync(Sala sala)
    {
        SalaDetalleDto detalle;
        lock (sala.Candado)
        {
            if (sala.EnPartida || sala.Jugadores.Count < 2 || sala.Jugadores.Any(j => !j.Listo))
                return false;

            sala.EnPartida = true;
            sala.RondaEnCurso = false;
            sala.RondaActual = 0;
            sala.InicioPartida = DateTime.UtcNow;
            sala.MapaResuelto = sala.MapaId == "aleatorio"
                ? Mapas[Random.Shared.Next(Mapas.Length)]
                : sala.MapaId;
            sala.Disparos.Clear();
            sala.PowerUps.Clear();
            sala.ZonasVeneno.Clear();

            foreach (var j in sala.Jugadores)
            {
                j.Vidas = sala.Vidas;
                j.HpActual = HpMaximo(j.TanqueId);
                j.EfectoActivo = null;
                j.EfectoHasta = DateTime.MinValue;
                j.Kills = 0;
                j.RondasGanadas = 0;
                // Se conservan en listo hasta terminar la partida para que la UI no parpadee.
            }
            detalle = Detalle(sala);
        }

        await _hub.Clients.Group(sala.Codigo).SendAsync("PartidaIniciada", detalle);
        await AvisarListaAsync();
        _ = Task.Run(async () => await IniciarRondaAsync(sala));
        return true;
    }

    public async Task ActualizarEstadoAsync(string conexionId, EstadoJugadorMsg estado)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return;
        EstadoJugadorMsg publicado;
        lock (sala.Candado)
        {
            var jugador = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (jugador is null) return;
            if (!double.IsFinite(estado.X) || !double.IsFinite(estado.Y) || estado.X < 0 || estado.X > 1280 || estado.Y < 0 || estado.Y > 720) return;
            jugador.X = estado.X;
            jugador.Y = estado.Y;
            jugador.Angulo = double.IsFinite(estado.Angulo) ? estado.Angulo : jugador.Angulo;
            jugador.Torreta = double.IsFinite(estado.Torreta) ? estado.Torreta : jugador.Torreta;
            publicado = estado with { UsuarioId = jugador.UsuarioId, Hp = jugador.HpActual };
        }
        await _hub.Clients.GroupExcept(sala.Codigo, new[] { conexionId }).SendAsync("EstadoRemoto", publicado);
    }

    public async Task LanzarZonaVenenoAsync(string conexionId, ZonaMsg zona)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return;
        ZonaMsg publicada;
        lock (sala.Candado)
        {
            var jugador = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (jugador is null || !sala.RondaEnCurso || jugador.Vidas <= 0 || jugador.HpActual <= 0) return;
            // TANK-02 es Juggernaut en el catálogo provisto.
            if (jugador.TanqueId != 2) return;
            var x = jugador.X;
            var y = jugador.Y;
            var radio = Math.Clamp(zona.Radio, 100, 220);
            var ms = Math.Clamp(zona.Ms, 2000, 7000);
            sala.ZonasVeneno[jugador.UsuarioId] = new ZonaVenenoRegistrada
            {
                UsuarioId = jugador.UsuarioId,
                X = x,
                Y = y,
                Radio = radio,
                ExpiraUtc = DateTime.UtcNow.AddMilliseconds(ms)
            };
            publicada = new ZonaMsg(jugador.UsuarioId, x, y, radio, ms);
        }
        await _hub.Clients.GroupExcept(sala.Codigo, new[] { conexionId }).SendAsync("ZonaRemota", publicada);
    }

    public async Task<ResultadoImpactoDto> AplicarVenenoAsync(string conexionId, int atacanteUsuarioId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return new(false, 0, 0, 0, false, false, "No estás en una sala.");
        ResultadoImpactoDto resultado;
        int killerId = 0;
        bool terminarRonda = false;
        int? ganador = null;
        string codigo;
        lock (sala.Candado)
        {
            codigo = sala.Codigo;
            var victima = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            var atacante = sala.Jugadores.FirstOrDefault(j => j.UsuarioId == atacanteUsuarioId);
            if (victima is null) return new(false, 0, 0, 0, false, false, "Víctima no encontrada.");
            if (!sala.RondaEnCurso || victima.Vidas <= 0 || victima.HpActual <= 0)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, victima.Vidas <= 0, "No puede recibir daño ahora.");
            if (atacante is null || atacante.UsuarioId == victima.UsuarioId || atacante.TanqueId != 2)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, false, "Zona de veneno inválida.");
            if (sala.ModoEquipos && atacante.EquipoId == victima.EquipoId)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, false, "El veneno no afecta aliados.");
            if (!sala.ZonasVeneno.TryGetValue(atacanteUsuarioId, out var zona) || zona.ExpiraUtc <= DateTime.UtcNow)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, false, "La zona tóxica ya expiró.");
            var dx = victima.X - zona.X;
            var dy = victima.Y - zona.Y;
            if ((dx * dx) + (dy * dy) > zona.Radio * zona.Radio)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, false, "Fuera de la zona tóxica.");
            var now = DateTime.UtcNow;
            if (zona.UltimoTickVictimaUtc.TryGetValue(victima.UsuarioId, out var last) && (now - last).TotalMilliseconds < 900)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, false, "Daño periódico ya aplicado.");
            zona.UltimoTickVictimaUtc[victima.UsuarioId] = now;
            if (victima.EfectoHasta <= now) victima.EfectoActivo = null;
            var dano = victima.EfectoActivo == "ESCUDO" ? 0 : 8;
            victima.HpActual = Math.Max(0, victima.HpActual - dano);
            var murio = victima.HpActual == 0;
            var eliminado = false;
            if (murio)
            {
                victima.Vidas = Math.Max(0, victima.Vidas - 1);
                victima.EfectoActivo = null;
                victima.EfectoHasta = DateTime.MinValue;
                atacante.Kills++;
                killerId = atacante.UsuarioId;
                eliminado = victima.Vidas == 0;
                if (eliminado)
                {
                    var vivos = sala.Jugadores.Where(j => j.Vidas > 0).ToList();
                    var bandosVivos = sala.ModoEquipos ? vivos.Select(j => j.EquipoId).Distinct().Count() : vivos.Count;
                    if (bandosVivos <= 1) { terminarRonda = true; ganador = vivos.FirstOrDefault()?.UsuarioId; }
                }
            }
            resultado = new ResultadoImpactoDto(true, victima.UsuarioId, victima.HpActual, victima.Vidas, murio, eliminado);
        }

        await _hub.Clients.Group(codigo).SendAsync("JugadorImpactado", new
        {
            usuarioId = resultado.UsuarioId,
            hpActual = resultado.HpActual,
            vidas = resultado.Vidas,
            murio = resultado.Murio,
            eliminado = resultado.Eliminado,
            fuente = "veneno"
        });
        if (resultado.Murio)
        {
            await _hub.Clients.Group(codigo).SendAsync("JugadorMurio", new
            {
                usuarioId = resultado.UsuarioId,
                killerId,
                vidasRestantes = resultado.Vidas,
                eliminado = resultado.Eliminado
            });
            if (!resultado.Eliminado) _ = Task.Run(async () => await ReaparecerAsync(sala, resultado.UsuarioId));
        }
        if (terminarRonda) _ = Task.Run(async () => await TerminarRondaAsync(sala, ganador, "veneno"));
        return resultado;
    }

    // Las muertes reales se registran mediante RegistrarImpactoAsync, que valida equipo y bala.
    // Se mantiene este método por compatibilidad; no acepta kills reportados por el cliente.
    public Task ReportarMuerteAsync(string conexionId, int killerUsuarioId) => Task.CompletedTask;

    public List<PowerUpOnlineDto> ListarPowerUps(string conexionId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return new List<PowerUpOnlineDto>();
        lock (sala.Candado) return sala.PowerUps.Values.ToList();
    }

    public async Task<bool> CrearPowerUpAsync(string conexionId, PowerUpOnlineDto item)
    {
        var sala = SalaDe(conexionId);
        if (sala is null || string.IsNullOrWhiteSpace(item.Id)) return false;

        lock (sala.Candado)
        {
            var host = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (host is null || host.UsuarioId != sala.HostUsuarioId || !sala.RondaEnCurso) return false;
            if (sala.PowerUps.Count >= 5 || sala.PowerUps.ContainsKey(item.Id)) return false;
            var tipos = new[] { "aceite", "botiquin", "escudo", "falla", "oruga", "sobrecarga" };
            if (!tipos.Contains(item.Tipo, StringComparer.OrdinalIgnoreCase)) return false;
            if (double.IsNaN(item.X) || double.IsNaN(item.Y) || item.X < 30 || item.X > 1250 || item.Y < 30 || item.Y > 690) return false;
            sala.PowerUps[item.Id] = item with { Tipo = item.Tipo.ToLowerInvariant() };
        }

        await _hub.Clients.Group(sala.Codigo).SendAsync("PowerUpAparecio", item);
        return true;
    }

    public async Task<bool> RecogerPowerUpAsync(string conexionId, string itemId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return false;
        PowerUpOnlineDto? item;
        int usuarioId;
        int hpActual;
        int vidas;
        lock (sala.Candado)
        {
            var jugador = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (jugador is null || !sala.RondaEnCurso || jugador.Vidas <= 0 || jugador.HpActual <= 0) return false;
            usuarioId = jugador.UsuarioId;
            if (!sala.PowerUps.Remove(itemId, out item)) return false;

            var tipo = item!.Tipo.ToLowerInvariant();
            if (tipo == "botiquin")
            {
                jugador.HpActual = Math.Min(HpMaximo(jugador.TanqueId), jugador.HpActual + 30);
            }
            else
            {
                jugador.EfectoActivo = tipo.ToUpperInvariant();
                jugador.EfectoHasta = DateTime.UtcNow.AddSeconds(10);
            }
            hpActual = jugador.HpActual;
            vidas = jugador.Vidas;
        }

        await _hub.Clients.Group(sala.Codigo).SendAsync("PowerUpRecogido", new { id = itemId, usuarioId, tipo = item!.Tipo });
        await _hub.Clients.Group(sala.Codigo).SendAsync("JugadorImpactado", new
        {
            usuarioId,
            hpActual,
            vidas,
            murio = false,
            eliminado = false
        });
        return true;
    }

    public async Task<bool> RegistrarDisparoAsync(string conexionId, DisparoMsg disparo)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return false;
        DisparoMsg publicado;
        lock (sala.Candado)
        {
            var jugador = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (jugador is null || !sala.RondaEnCurso || jugador.Vidas <= 0 || jugador.HpActual <= 0) return false;
            if (jugador.EfectoHasta <= DateTime.UtcNow) jugador.EfectoActivo = null;
            if (jugador.EfectoActivo == "FALLA") return false;
            var balaId = string.IsNullOrWhiteSpace(disparo.BalaId) ? Guid.NewGuid().ToString("N") : disparo.BalaId;
            if (sala.Disparos.ContainsKey(balaId)) return false;
            sala.Disparos[balaId] = new DisparoRegistrado { UsuarioId = jugador.UsuarioId, ArmaId = disparo.ArmaId, Perforante = disparo.Perforante };
            publicado = disparo with { UsuarioId = jugador.UsuarioId, BalaId = balaId };
        }
        await _hub.Clients.GroupExcept(sala.Codigo, new[] { conexionId }).SendAsync("DisparoRemoto", publicado);
        return true;
    }

    public async Task<ResultadoImpactoDto> RegistrarImpactoAsync(string conexionId, string balaId)
    {
        var sala = SalaDe(conexionId);
        if (sala is null) return new(false, 0, 0, 0, false, false, "No estás en una sala.");

        ResultadoImpactoDto resultado;
        int? ganador = null;
        bool terminarRonda = false;
        int atacanteId = 0;
        string codigo;
        lock (sala.Candado)
        {
            codigo = sala.Codigo;
            var victima = sala.Jugadores.FirstOrDefault(j => j.ConexionId == conexionId);
            if (victima is null) return new(false, 0, 0, 0, false, false, "Jugador no encontrado.");
            if (!sala.RondaEnCurso || victima.Vidas <= 0 || victima.HpActual <= 0)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, victima.Vidas <= 0, "Jugador no puede recibir daño ahora.");
            if (!sala.Disparos.TryGetValue(balaId, out var disparo) || disparo.Consumido)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, false, "El disparo ya no está activo.");

            var atacante = sala.Jugadores.FirstOrDefault(j => j.UsuarioId == disparo.UsuarioId);
            if (atacante is null || atacante.UsuarioId == victima.UsuarioId)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, false, "Disparo inválido.");
            if (sala.ModoEquipos && atacante.EquipoId == victima.EquipoId)
                return new(false, victima.UsuarioId, victima.HpActual, victima.Vidas, false, false, "El fuego amigo está desactivado.");

            disparo.Consumido = true;
            atacanteId = atacante.UsuarioId;
            if (atacante.EfectoHasta <= DateTime.UtcNow) atacante.EfectoActivo = null;
            if (victima.EfectoHasta <= DateTime.UtcNow) victima.EfectoActivo = null;
            var danoBase = disparo.ArmaId switch { "WEAP-01" => 28, "WEAP-03" => 95, _ => 45 };
            var dano = victima.EfectoActivo == "ESCUDO" ? 0
                : atacante.EfectoActivo == "SOBRECARGA" ? (int)Math.Ceiling(danoBase * 1.5)
                : danoBase;
            if (disparo.Perforante && dano > 0) dano = (int)Math.Ceiling(dano * 1.5);
            victima.HpActual = Math.Max(0, victima.HpActual - dano);
            bool murio = victima.HpActual == 0;
            bool eliminado = false;
            if (murio)
            {
                victima.Vidas = Math.Max(0, victima.Vidas - 1);
                victima.EfectoActivo = null;
                victima.EfectoHasta = DateTime.MinValue;
                atacante.Kills++;
                eliminado = victima.Vidas == 0;
                if (eliminado)
                {
                    var vivos = sala.Jugadores.Where(j => j.Vidas > 0).ToList();
                    var bandosVivos = sala.ModoEquipos ? vivos.Select(j => j.EquipoId).Distinct().Count() : vivos.Count;
                    if (bandosVivos <= 1)
                    {
                        terminarRonda = true;
                        ganador = vivos.FirstOrDefault()?.UsuarioId;
                    }
                }
            }
            resultado = new ResultadoImpactoDto(true, victima.UsuarioId, victima.HpActual, victima.Vidas, murio, eliminado);
        }

        await _hub.Clients.Group(codigo).SendAsync("DisparoConsumido", balaId);
        await _hub.Clients.Group(codigo).SendAsync("JugadorImpactado", new
        {
            usuarioId = resultado.UsuarioId,
            hpActual = resultado.HpActual,
            vidas = resultado.Vidas,
            murio = resultado.Murio,
            eliminado = resultado.Eliminado
        });

        if (resultado.Murio)
        {
            await _hub.Clients.Group(codigo).SendAsync("JugadorMurio", new
            {
                usuarioId = resultado.UsuarioId,
                killerId = atacanteId,
                vidasRestantes = resultado.Vidas,
                eliminado = resultado.Eliminado
            });
            if (!resultado.Eliminado)
                _ = Task.Run(async () => await ReaparecerAsync(sala, resultado.UsuarioId));
        }

        if (terminarRonda)
            _ = Task.Run(async () => await TerminarRondaAsync(sala, ganador, "eliminacion"));
        return resultado;
    }

    private async Task ReaparecerAsync(Sala sala, int usuarioId)
    {
        await Task.Delay(900);
        int hp;
        int vidas;
        lock (sala.Candado)
        {
            if (!sala.EnPartida || !sala.RondaEnCurso) return;
            var jugador = sala.Jugadores.FirstOrDefault(j => j.UsuarioId == usuarioId);
            if (jugador is null || jugador.Vidas <= 0) return;
            jugador.HpActual = HpMaximo(jugador.TanqueId);
            hp = jugador.HpActual;
            vidas = jugador.Vidas;
        }
        await _hub.Clients.Group(sala.Codigo).SendAsync("JugadorReaparecio", new { usuarioId, hpActual = hp, vidas });
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
            foreach (var j in sala.Jugadores)
            {
                j.Vidas = sala.Vidas;
                j.HpActual = HpMaximo(j.TanqueId);
                j.EfectoActivo = null;
                j.EfectoHasta = DateTime.MinValue;
            }
            sala.Disparos.Clear();
            sala.PowerUps.Clear();
            sala.ZonasVeneno.Clear();

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
                if (g != null)
                {
                    if (sala.ModoEquipos)
                    {
                        foreach (var miembro in sala.Jugadores.Where(j => j.EquipoId == g.EquipoId))
                            miembro.RondasGanadas++;
                    }
                    else g.RondasGanadas++;
                }
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

    private static int EquipoParaSlot(Sala sala, int slot) => sala.ModoEquipos ? slot % 2 : slot;

    private static int HpMaximo(int tanqueId) => tanqueId switch
    {
        2 => 160,
        3 => 110,
        _ => 80
    };

    private static JugadorEnSala NuevoJugador(string conexionId, int usuarioId, string nombre, int slot, Equipo equipo, string color, string fotoPerfil) => new()
    {
        ConexionId = conexionId,
        UsuarioId = usuarioId,
        Nombre = nombre,
        Slot = slot,
        TanqueId = equipo.TanqueId,
        ArmaId = equipo.ArmaId,
        Color = color,
        HpActual = HpMaximo(equipo.TanqueId),
        FotoPerfil = fotoPerfil
    };

    private SalaDetalleDto DetalleSeguro(Sala sala)
    {
        lock (sala.Candado) { return Detalle(sala); }
    }

    private static SalaDetalleDto Detalle(Sala s) => new(
        s.Codigo, s.Nombre,
        s.EnPartida ? s.MapaResuelto : s.MapaId,
        s.Rondas, s.Vidas, s.Maximo, s.Privada, s.EnPartida, s.HostUsuarioId, s.ModoEquipos,
        s.Jugadores.OrderBy(j => j.Slot)
            .Select(j => new JugadorSalaDto(j.UsuarioId, j.Nombre, j.Slot, j.TanqueId, j.ArmaId,
                j.Color, j.UsuarioId == s.HostUsuarioId, j.RondasGanadas, j.Vidas, j.FotoPerfil,
                j.EquipoId, j.HpActual, j.Listo))
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
