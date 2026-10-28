using JuegoTanques.AccesoDatos.Contexto;   // <-- el mismo namespace que ya usas en AuthServicio
using JuegoTanques.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace JuegoTanques.API.Servicios;

// ================= Datos que viajan hacia el front =================
public record ResumenJugadorDto(
    int UsuarioId, string Nombre, string Correo,
    int Nivel, int Experiencia, int ExperienciaSiguienteNivel, int Monedas,
    int Partidas, int Victorias, int Derrotas, int TanquesDestruidos,
    string? FotoPerfil); // 🟢 1. Añadido para que la foto viaje también en el resumen del perfil

public record TanqueCatalogoDto(int Id, string Nombre, int VidaBase, double VelocidadBase, int Blindaje, int Precio);
public record ArmaCatalogoDto(int Id, string Nombre, int DanioBase, double CadenciaFuego, double VelocidadProyectil, int Precio);
public record CatalogoDto(List<TanqueCatalogoDto> Tanques, List<ArmaCatalogoDto> Armas);
public record InventarioDto(List<int> TanqueIds, List<int> ArmaIds);
public record PresetDto(int PresetId, int NumeroSlot, string Nombre, int TanqueId, int ArmaId, bool EsActivo);
public record RankingItemDto(int Posicion, int UsuarioId, string Nombre, int Nivel, int Victorias, int Derrotas, string? FotoPerfil);
public record CompraRespuestaDto(int Monedas);

// ================= Datos que llegan desde el front =================
public record EquiparSolicitud(int? TanqueId, int? ArmaId);
public record GuardarPresetSolicitud(int NumeroSlot, string? Nombre, int TanqueId, int ArmaId);
public record CompraSolicitud(string Tipo, int Id);

public class JuegoServicio
{
    private const int MaxPresets = 3;
    private const int TanqueBaseId = 1;
    private const int ArmaBaseId = 1;

    private readonly JuegoTanquesContext _db;

    public JuegoServicio(JuegoTanquesContext db)
    {
        _db = db;
    }

    // Sirve tanto si la columna es int como si es int? en tu entidad
    private static int N(int? valor) => valor ?? 0;

    // XP que hace falta para pasar del nivel actual al siguiente
    public static int XpRequerida(int nivel) => 100 * Math.Max(1, nivel);

    // =====================================================
    //  RESUMEN DEL JUGADOR (inicio y perfil)
    // =====================================================
    public async Task<ResultadoAuth<ResumenJugadorDto>> ObtenerResumenAsync(int usuarioId)
    {
        var u = await _db.Usuarios.AsNoTracking().FirstOrDefaultAsync(x => x.UsuarioId == usuarioId);
        if (u is null)
            return ResultadoAuth<ResumenJugadorDto>.Fallo("Usuario no encontrado.");

        // Victoria = terminar la partida en la posición 1
        var detalles = _db.Set<DetallePartidaJugador>().AsNoTracking().Where(d => d.UsuarioId == usuarioId);
        var partidas = await detalles.CountAsync();
        var victorias = await detalles.CountAsync(d => d.PosicionFinal == 1);
        var destruidos = await detalles.SumAsync(d => (int?)d.TanquesDestruidos) ?? 0;

        var nivel = Math.Max(1, N(u.Nivel));

        return ResultadoAuth<ResumenJugadorDto>.Ok(new ResumenJugadorDto(
            u.UsuarioId, u.Username, u.Email,
            nivel, N(u.Experiencia), XpRequerida(nivel), N(u.Monedas),
            partidas, victorias, partidas - victorias, destruidos,
            u.FotoPerfil)); // 🟢 2. Devolvemos la foto aquí para que el perfil la reciba al refrescar
    }

    // =====================================================
    //  CATÁLOGO (tanques y armas de la tienda)
    // =====================================================
    public async Task<ResultadoAuth<CatalogoDto>> ObtenerCatalogoAsync()
    {
        var tanques = await _db.Set<Tanque>().AsNoTracking()
            .OrderBy(t => t.TanqueId)
            .Select(t => new TanqueCatalogoDto(t.TanqueId, t.Nombre, t.VidaBase, t.VelocidadBase, t.Blindaje, t.Precio))
            .ToListAsync();

        var armas = await _db.Set<Arma>().AsNoTracking()
            .OrderBy(a => a.ArmaId)
            .Select(a => new ArmaCatalogoDto(a.ArmaId, a.Nombre, a.DanioBase, a.CadenciaFuego, a.VelocidadProyectil, a.Precio))
            .ToListAsync();

        return ResultadoAuth<CatalogoDto>.Ok(new CatalogoDto(tanques, armas));
    }

    // =====================================================
    //  INVENTARIO (lo que ya compró el jugador)
    // =====================================================
    public async Task<ResultadoAuth<InventarioDto>> ObtenerInventarioAsync(int usuarioId)
    {
        var tanques = await _db.InventarioTanques.AsNoTracking()
            .Where(i => i.UsuarioId == usuarioId).Select(i => i.TanqueId).ToListAsync();

        var armas = await _db.InventarioArmas.AsNoTracking()
            .Where(i => i.UsuarioId == usuarioId).Select(i => i.ArmaId).ToListAsync();

        return ResultadoAuth<InventarioDto>.Ok(new InventarioDto(tanques, armas));
    }

    // =====================================================
    //  PRESETS (el que tiene EsActivo = true es el equipo actual)
    // =====================================================
    public async Task<ResultadoAuth<List<PresetDto>>> ObtenerPresetsAsync(int usuarioId)
    {
        var lista = await _db.EquipamientosPreguardados.AsNoTracking()
            .Where(p => p.UsuarioId == usuarioId)
            .OrderBy(p => p.NumeroSlot)
            .ToListAsync();

        return ResultadoAuth<List<PresetDto>>.Ok(lista.Select(AdtoPreset).ToList());
    }

    public async Task<ResultadoAuth<List<PresetDto>>> GuardarPresetAsync(int usuarioId, GuardarPresetSolicitud datos)
    {
        if (datos.NumeroSlot < 1 || datos.NumeroSlot > MaxPresets)
            return ResultadoAuth<List<PresetDto>>.Fallo($"Solo hay {MaxPresets} espacios de presets.");

        if (!await PoseeAsync(usuarioId, datos.TanqueId, datos.ArmaId))
            return ResultadoAuth<List<PresetDto>>.Fallo("Solo puedes usar tanques y armas que ya compraste.");

        var nombre = string.IsNullOrWhiteSpace(datos.Nombre) ? $"Preset {datos.NumeroSlot}" : datos.Nombre.Trim();
        if (nombre.Length > 30) nombre = nombre[..30];

        var existente = await _db.EquipamientosPreguardados
            .FirstOrDefaultAsync(p => p.UsuarioId == usuarioId && p.NumeroSlot == datos.NumeroSlot);

        if (existente is null)
        {
            _db.EquipamientosPreguardados.Add(new EquipamientosPreguardados
            {
                UsuarioId = usuarioId,
                NumeroSlot = datos.NumeroSlot,
                NombrePreset = nombre,
                TanqueId = datos.TanqueId,
                ArmaId = datos.ArmaId,
                EsActivo = false
            });
        }
        else
        {
            existente.NombrePreset = nombre;
            existente.TanqueId = datos.TanqueId;
            existente.ArmaId = datos.ArmaId;
        }

        await _db.SaveChangesAsync();
        return await ObtenerPresetsAsync(usuarioId);
    }

    public async Task<ResultadoAuth<List<PresetDto>>> ActivarPresetAsync(int usuarioId, int presetId)
    {
        var presets = await _db.EquipamientosPreguardados.Where(p => p.UsuarioId == usuarioId).ToListAsync();

        if (!presets.Any(p => p.PresetId == presetId))
            return ResultadoAuth<List<PresetDto>>.Fallo("Ese preset no existe.");

        foreach (var p in presets)
            p.EsActivo = p.PresetId == presetId;

        await _db.SaveChangesAsync();
        return await ObtenerPresetsAsync(usuarioId);
    }

    // Cambia el tanque y/o el arma del preset activo
    public async Task<ResultadoAuth<List<PresetDto>>> EquiparAsync(int usuarioId, EquiparSolicitud datos)
    {
        if (datos.TanqueId is null && datos.ArmaId is null)
            return ResultadoAuth<List<PresetDto>>.Fallo("No indicaste qué equipar.");

        var activo = await _db.EquipamientosPreguardados
            .Where(p => p.UsuarioId == usuarioId && p.EsActivo == true)
            .OrderBy(p => p.NumeroSlot)
            .FirstOrDefaultAsync();

        var tanqueId = datos.TanqueId ?? activo?.TanqueId ?? TanqueBaseId;
        var armaId = datos.ArmaId ?? activo?.ArmaId ?? ArmaBaseId;

        if (!await PoseeAsync(usuarioId, tanqueId, armaId))
            return ResultadoAuth<List<PresetDto>>.Fallo("Primero debes comprarlo en la tienda.");

        if (activo is null)
        {
            _db.EquipamientosPreguardados.Add(new EquipamientosPreguardados
            {
                UsuarioId = usuarioId,
                NumeroSlot = 1,
                NombrePreset = "Preset 1",
                TanqueId = tanqueId,
                ArmaId = armaId,
                EsActivo = true
            });
        }
        else
        {
            activo.TanqueId = tanqueId;
            activo.ArmaId = armaId;
        }

        await _db.SaveChangesAsync();
        return await ObtenerPresetsAsync(usuarioId);
    }

    // =====================================================
    //  TIENDA: comprar un tanque o un arma
    // =====================================================
    public async Task<ResultadoAuth<CompraRespuestaDto>> ComprarAsync(int usuarioId, CompraSolicitud datos)
    {
        var tipo = (datos.Tipo ?? string.Empty).Trim().ToLowerInvariant();
        if (tipo != "tanque" && tipo != "arma")
            return ResultadoAuth<CompraRespuestaDto>.Fallo("Tipo de compra no válido.");

        await using var transaccion = await _db.Database.BeginTransactionAsync();

        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == usuarioId);
        if (usuario is null)
            return ResultadoAuth<CompraRespuestaDto>.Fallo("Usuario no encontrado.");

        int precio;
        if (tipo == "tanque")
        {
            var tanque = await _db.Set<Tanque>().FirstOrDefaultAsync(t => t.TanqueId == datos.Id);
            if (tanque is null)
                return ResultadoAuth<CompraRespuestaDto>.Fallo("Ese tanque no existe.");
            if (await _db.InventarioTanques.AnyAsync(i => i.UsuarioId == usuarioId && i.TanqueId == datos.Id))
                return ResultadoAuth<CompraRespuestaDto>.Fallo("Ya tienes ese tanque.");
            precio = tanque.Precio;
        }
        else
        {
            var arma = await _db.Set<Arma>().FirstOrDefaultAsync(a => a.ArmaId == datos.Id);
            if (arma is null)
                return ResultadoAuth<CompraRespuestaDto>.Fallo("Esa arma no existe.");
            if (await _db.InventarioArmas.AnyAsync(i => i.UsuarioId == usuarioId && i.ArmaId == datos.Id))
                return ResultadoAuth<CompraRespuestaDto>.Fallo("Ya tienes esa arma.");
            precio = arma.Precio;
        }

        var monedas = N(usuario.Monedas);
        if (monedas < precio)
            return ResultadoAuth<CompraRespuestaDto>.Fallo($"No tienes monedas suficientes (te faltan {precio - monedas}).");

        usuario.Monedas = monedas - precio;

        if (tipo == "tanque")
            _db.InventarioTanques.Add(new InventarioTanque { UsuarioId = usuarioId, TanqueId = datos.Id, FechaAdquisicion = DateTime.Now });
        else
            _db.InventarioArmas.Add(new InventarioArma { UsuarioId = usuarioId, ArmaId = datos.Id, FechaAdquisicion = DateTime.Now });

        await _db.SaveChangesAsync();
        await transaccion.CommitAsync();

        return ResultadoAuth<CompraRespuestaDto>.Ok(new CompraRespuestaDto(monedas - precio));
    }

    // =====================================================
    //  RANKING
    // =====================================================
    public async Task<ResultadoAuth<List<RankingItemDto>>> ObtenerRankingAsync()
    {
        var usuarios = await _db.Usuarios.AsNoTracking()
            .Select(u => new { u.UsuarioId, u.Username, u.Nivel, u.Experiencia, u.FotoPerfil })
            .ToListAsync();

        var stats = await _db.Set<DetallePartidaJugador>().AsNoTracking()
            .GroupBy(d => d.UsuarioId)
            .Select(g => new
            {
                UsuarioId = g.Key,
                Partidas = g.Count(),
                Victorias = g.Count(d => d.PosicionFinal == 1)
            })
            .ToListAsync();

        var porUsuario = stats.ToDictionary(s => s.UsuarioId);

        var lista = usuarios
            .Select(u =>
            {
                porUsuario.TryGetValue(u.UsuarioId, out var s);
                var partidas = s?.Partidas ?? 0;
                var victorias = s?.Victorias ?? 0;
                return new
                {
                    u.UsuarioId,
                    u.Username,
                    Nivel = Math.Max(1, N(u.Nivel)),
                    Xp = N(u.Experiencia),
                    Victorias = victorias,
                    Derrotas = partidas - victorias,
                    u.FotoPerfil
                };
            })
            .OrderByDescending(x => x.Nivel)
            .ThenByDescending(x => x.Xp)
            .Take(200)
            .Select((x, i) => new RankingItemDto(
                i + 1,
                x.UsuarioId,
                x.Username,
                x.Nivel,
                x.Victorias,
                x.Derrotas,
                x.FotoPerfil
            ))
            .ToList();

        return ResultadoAuth<List<RankingItemDto>>.Ok(lista);
    }

    // =====================================================
    //  Ayudas internas
    // =====================================================
    private async Task<bool> PoseeAsync(int usuarioId, int tanqueId, int armaId)
    {
        return await _db.InventarioTanques.AnyAsync(i => i.UsuarioId == usuarioId && i.TanqueId == tanqueId)
            && await _db.InventarioArmas.AnyAsync(i => i.UsuarioId == usuarioId && i.ArmaId == armaId);
    }

    private static PresetDto AdtoPreset(EquipamientosPreguardados p) => new(
        p.PresetId,
        p.NumeroSlot,
        string.IsNullOrWhiteSpace(p.NombrePreset) ? $"Preset {p.NumeroSlot}" : p.NombrePreset!,
        p.TanqueId,
        p.ArmaId,
        p.EsActivo == true);
}