using JuegoTanques.AccesoDatos.Contexto;
using JuegoTanques.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace JuegoTanques.API.Servicios;

// ================= Datos que llegan / salen =================
public record FinalizarOfflineSolicitud(
    bool Victoria, int RondasGanadas, int RondasJugadas, int TanquesDestruidos,
    int DuracionSegundos, string? Dificultad, int NumBots);

public record ResultadoPartidaDto(
    int XpGanada, int MonedasGanadas, int Nivel, int Experiencia,
    int ExperienciaSiguienteNivel, bool SubioNivel, int Monedas);

public record ResultadoOnlineEntrada(int UsuarioId, int Posicion, int Kills, int RondasGanadas);
public record ResultadoOnlineSalida(int UsuarioId, int XpGanada, int MonedasGanadas, int Nivel, bool SubioNivel);

public class ProgresoServicio
{
    private readonly JuegoTanquesContext _db;

    public ProgresoServicio(JuegoTanquesContext db)
    {
        _db = db;
    }

    private static int N(int? valor) => valor ?? 0;

    // =====================================================
    //  RECOMPENSAS (aquí ajustas cuánto se gana)
    // =====================================================
    public static int XpOffline(bool victoria, int numBots, string? dificultad, int kills)
    {
        numBots = Math.Clamp(numBots, 1, 6);
        kills = Math.Clamp(kills, 0, 60);

        var factor = dificultad switch
        {
            "facil" => 0.5,
            "dificil" => 1.5,
            _ => 1.0
        };

        // Ganar: 40 base + 15 por bot (según dificultad) + 2 por cada tanque destruido
        if (victoria)
            return 40 + (int)Math.Round(15 * numBots * factor) + 2 * kills;

        // Perder: un poco de XP por participar
        return Math.Min(50, 5 + 3 * kills);
    }

    public static (int Xp, int Monedas) RecompensaOnline(int posicion, int kills)
    {
        kills = Math.Clamp(kills, 0, 100);
        var xp = (posicion == 1 ? 100 : 25) + 15 * kills;
        var monedas = (posicion == 1 ? 150 : posicion == 2 ? 60 : 30) + 10 * kills;
        return (xp, monedas);
    }

    // Suma XP y sube de nivel las veces que haga falta
    private static (int Nivel, int Xp, bool Subio) SumarXp(int nivel, int xpActual, int ganada)
    {
        nivel = Math.Max(1, nivel);
        var xp = xpActual + ganada;
        var subio = false;

        while (xp >= JuegoServicio.XpRequerida(nivel))
        {
            xp -= JuegoServicio.XpRequerida(nivel);
            nivel++;
            subio = true;
        }
        return (nivel, xp, subio);
    }

    // =====================================================
    //  PARTIDA OFFLINE: solo XP (sin monedas)
    // =====================================================
    public async Task<ResultadoAuth<ResultadoPartidaDto>> FinalizarOfflineAsync(int usuarioId, FinalizarOfflineSolicitud datos)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == usuarioId);
        if (usuario is null)
            return ResultadoAuth<ResultadoPartidaDto>.Fallo("Usuario no encontrado.");

        var duracion = Math.Clamp(datos.DuracionSegundos, 0, 7200);
        var kills = Math.Clamp(datos.TanquesDestruidos, 0, 60);
        var xp = XpOffline(datos.Victoria, datos.NumBots, datos.Dificultad, kills);

        await using var transaccion = await _db.Database.BeginTransactionAsync();

        var ahora = DateTime.Now;
        var partida = new Partida
        {
            ModoJuego = "offline",
            FechaInicio = ahora.AddSeconds(-duracion),
            FechaFin = ahora,
            DuracionSegundos = duracion
        };
        _db.Add(partida);
        await _db.SaveChangesAsync();   // aquí SQL Server le asigna el PartidaId

        _db.Add(new DetallePartidaJugador
        {
            PartidaId = partida.PartidaId,
            UsuarioId = usuarioId,
            TanquesDestruidos = kills,
            DanoInfligido = 0,
            PosicionFinal = datos.Victoria ? 1 : 2,
            MonedasGanadas = 0,
            XpGanada = xp
        });

        var (nivel, xpNuevo, subio) = SumarXp(N(usuario.Nivel), N(usuario.Experiencia), xp);
        usuario.Nivel = nivel;
        usuario.Experiencia = xpNuevo;

        await _db.SaveChangesAsync();
        await transaccion.CommitAsync();

        return ResultadoAuth<ResultadoPartidaDto>.Ok(new ResultadoPartidaDto(
            xp, 0, nivel, xpNuevo, JuegoServicio.XpRequerida(nivel), subio, N(usuario.Monedas)));
    }

    // =====================================================
    //  PARTIDA ONLINE: XP y monedas para todos los jugadores
    // =====================================================
    public async Task<List<ResultadoOnlineSalida>> FinalizarOnlineAsync(List<ResultadoOnlineEntrada> entradas, int duracionSegundos)
    {
        var duracion = Math.Clamp(duracionSegundos, 0, 7200);
        var salidas = new List<ResultadoOnlineSalida>();

        await using var transaccion = await _db.Database.BeginTransactionAsync();

        var ahora = DateTime.Now;
        var partida = new Partida
        {
            ModoJuego = "online",
            FechaInicio = ahora.AddSeconds(-duracion),
            FechaFin = ahora,
            DuracionSegundos = duracion
        };
        _db.Add(partida);
        await _db.SaveChangesAsync();

        var ids = entradas.Select(e => e.UsuarioId).ToList();
        var usuarios = await _db.Usuarios.Where(u => ids.Contains(u.UsuarioId)).ToListAsync();

        foreach (var e in entradas)
        {
            var usuario = usuarios.FirstOrDefault(u => u.UsuarioId == e.UsuarioId);
            if (usuario is null) continue;

            var (xp, monedas) = RecompensaOnline(e.Posicion, e.Kills);
            var (nivel, xpNuevo, subio) = SumarXp(N(usuario.Nivel), N(usuario.Experiencia), xp);

            usuario.Nivel = nivel;
            usuario.Experiencia = xpNuevo;
            usuario.Monedas = N(usuario.Monedas) + monedas;

            _db.Add(new DetallePartidaJugador
            {
                PartidaId = partida.PartidaId,
                UsuarioId = e.UsuarioId,
                TanquesDestruidos = e.Kills,
                DanoInfligido = 0,
                PosicionFinal = e.Posicion,
                MonedasGanadas = monedas,
                XpGanada = xp
            });

            salidas.Add(new ResultadoOnlineSalida(e.UsuarioId, xp, monedas, nivel, subio));
        }

        await _db.SaveChangesAsync();
        await transaccion.CommitAsync();
        return salidas;
    }
}