using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using JuegoTanques.AccesoDatos.Contexto;   // <-- si tu DbContext está en otro namespace, cámbialo
using JuegoTanques.Dominio.DTO;
using JuegoTanques.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace JuegoTanques.API.Servicios;

public class RegistroRespuesta
{
    public string Mensaje { get; set; } = string.Empty;
    public string? CodigoDesarrollo { get; set; }
}

public class SesionRespuesta
{
    public string Token { get; set; } = string.Empty;
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
}

// Registro que está esperando el código (vive unos minutos en memoria)
public record RegistroPendiente(
    string Username,
    string Correo,
    string PasswordHash,
    string Codigo,
    DateTimeOffset Expira,
    int Intentos,
    DateTimeOffset UltimoEnvio);

public class AuthServicio
{
    // ---------- Valores que puedes cambiar ----------
    private const int MonedasIniciales = 500;
    private const int TanqueBaseId = 1;          // Scout Táctico
    private const int ArmaBaseId = 1;            // Escopeta de Dispersión
    private const string RolJugador = "Cliente"; // el rol que reciben los jugadores nuevos
    private const int MinutosCodigo = 10;
    private const int SegundosEntreReenvios = 60;
    private const int MaxIntentos = 5;

    private readonly JuegoTanquesContext _db;
    private readonly IMemoryCache _cache;
    private readonly ICorreoServicio _correo;
    private readonly JwtServicio _jwt;
    private readonly IWebHostEnvironment _env;

    public AuthServicio(
        JuegoTanquesContext db,
        IMemoryCache cache,
        ICorreoServicio correo,
        JwtServicio jwt,
        IWebHostEnvironment env)
    {
        _db = db;
        _cache = cache;
        _correo = correo;
        _jwt = jwt;
        _env = env;
    }

    // =====================================================
    //  1) REGISTRAR: valida, sugiere nombres y manda el código
    // =====================================================
    public async Task<ResultadoAuth<RegistroRespuesta>> RegistrarAsync(RegistroUsuarioDto datos)
    {
        var nombre = (datos.Nombre ?? string.Empty).Trim();
        var correo = (datos.Correo ?? string.Empty).Trim().ToLowerInvariant();
        var clave = datos.Contrasena ?? string.Empty;

        if (!Regex.IsMatch(nombre, @"^[A-Za-z0-9._-]{3,20}$"))
            return ResultadoAuth<RegistroRespuesta>.Fallo(
                "El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo.");

        if (!CorreoValido(correo))
            return ResultadoAuth<RegistroRespuesta>.Fallo("El correo no es válido.");

        if (clave.Length < 6)
            return ResultadoAuth<RegistroRespuesta>.Fallo("La contraseña debe tener al menos 6 caracteres.");

        if (await _db.Usuarios.AnyAsync(u => u.Email == correo))
            return ResultadoAuth<RegistroRespuesta>.Fallo("Ese correo ya está registrado. Inicia sesión.");

        if (await _db.Usuarios.AnyAsync(u => u.Username == nombre))
        {
            var sugerencias = await GenerarSugerenciasAsync(nombre);
            return ResultadoAuth<RegistroRespuesta>.Fallo("Ese nombre de usuario ya está en uso.", sugerencias);
        }

        var ahora = DateTimeOffset.UtcNow;
        var codigo = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        var pendiente = new RegistroPendiente(
            nombre, correo, HashearClave(clave), codigo, ahora.AddMinutes(MinutosCodigo), 0, ahora);
        _cache.Set(ClaveCache(correo), pendiente, pendiente.Expira);

        var enviado = await _correo.EnviarCodigoAsync(correo, nombre, codigo);

        if (!enviado && !_env.IsDevelopment())
        {
            _cache.Remove(ClaveCache(correo));
            return ResultadoAuth<RegistroRespuesta>.Fallo(
                "No pudimos enviar el correo de verificación. Intenta de nuevo en unos minutos.");
        }

        return ResultadoAuth<RegistroRespuesta>.Ok(new RegistroRespuesta
        {
            Mensaje = enviado
                ? $"Te enviamos un código de verificación a {correo}."
                : "No se pudo enviar el correo (modo desarrollo). Usa el código de prueba de abajo.",
            // Solo en desarrollo y solo si el correo falló
            CodigoDesarrollo = (!enviado && _env.IsDevelopment()) ? codigo : null
        });
    }

    // =====================================================
    //  2) VERIFICAR CÓDIGO: crea el usuario con su equipo base
    // =====================================================
    public async Task<ResultadoAuth<SesionRespuesta>> VerificarCorreoAsync(VerificarCorreoDto datos)
    {
        var correo = (datos.Correo ?? string.Empty).Trim().ToLowerInvariant();
        var codigo = (datos.Codigo ?? string.Empty).Trim();

        if (!_cache.TryGetValue(ClaveCache(correo), out RegistroPendiente? pendiente)
            || pendiente is null
            || pendiente.Expira <= DateTimeOffset.UtcNow)
        {
            _cache.Remove(ClaveCache(correo));
            return ResultadoAuth<SesionRespuesta>.Fallo("El código venció o no hay un registro pendiente. Regístrate de nuevo.");
        }

        if (pendiente.Intentos >= MaxIntentos)
        {
            _cache.Remove(ClaveCache(correo));
            return ResultadoAuth<SesionRespuesta>.Fallo("Demasiados intentos. Regístrate de nuevo.");
        }

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(pendiente.Codigo), Encoding.UTF8.GetBytes(codigo)))
        {
            _cache.Set(ClaveCache(correo), pendiente with { Intentos = pendiente.Intentos + 1 }, pendiente.Expira);
            return ResultadoAuth<SesionRespuesta>.Fallo("Código incorrecto.");
        }

        // Por si alguien se registró con ese nombre o correo mientras esperabas el código
        if (await _db.Usuarios.AnyAsync(u => u.Username == pendiente.Username || u.Email == pendiente.Correo))
        {
            _cache.Remove(ClaveCache(correo));
            return ResultadoAuth<SesionRespuesta>.Fallo("Ese usuario o correo ya fue tomado. Regístrate de nuevo.");
        }

        var rol = await _db.Roles.FirstOrDefaultAsync(r => r.Nombre == RolJugador);
        if (rol is null)
            return ResultadoAuth<SesionRespuesta>.Fallo($"Falta el rol '{RolJugador}' en la base de datos.");

        await using var transaccion = await _db.Database.BeginTransactionAsync();

        var usuario = new Usuario
        {
            Username = pendiente.Username,
            Email = pendiente.Correo,
            PasswordHash = pendiente.PasswordHash,
            RolId = rol.RolId,
            Nivel = 1,
            Experiencia = 0,
            Monedas = MonedasIniciales,
            FechaRegistro = DateTime.Now
        };
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();   // aquí SQL Server le asigna el UsuarioId

        // Equipo base: un tanque, un arma y un preset activo
        _db.InventarioTanques.Add(new InventarioTanque
        {
            UsuarioId = usuario.UsuarioId,
            TanqueId = TanqueBaseId,
            FechaAdquisicion = DateTime.Now
        });
        _db.InventarioArmas.Add(new InventarioArma
        {
            UsuarioId = usuario.UsuarioId,
            ArmaId = ArmaBaseId,
            FechaAdquisicion = DateTime.Now
        });
        _db.EquipamientosPreguardados.Add(new EquipamientosPreguardados
        {
            UsuarioId = usuario.UsuarioId,
            NumeroSlot = 1,
            NombrePreset = "Preset 1",
            TanqueId = TanqueBaseId,
            ArmaId = ArmaBaseId,
            EsActivo = true
        });
        await _db.SaveChangesAsync();
        await transaccion.CommitAsync();

        _cache.Remove(ClaveCache(correo));

        return ResultadoAuth<SesionRespuesta>.Ok(CrearSesion(usuario, rol.Nombre));
    }

    // =====================================================
    //  3) REENVIAR CÓDIGO
    // =====================================================
    public async Task<ResultadoAuth<string>> ReenviarCodigoAsync(ReenviarCodigoDto datos)
    {
        var correo = (datos.Correo ?? string.Empty).Trim().ToLowerInvariant();

        if (!_cache.TryGetValue(ClaveCache(correo), out RegistroPendiente? pendiente)
            || pendiente is null
            || pendiente.Expira <= DateTimeOffset.UtcNow)
            return ResultadoAuth<string>.Fallo("No hay un registro pendiente para ese correo. Regístrate de nuevo.");

        var ahora = DateTimeOffset.UtcNow;
        var espera = SegundosEntreReenvios - (int)(ahora - pendiente.UltimoEnvio).TotalSeconds;
        if (espera > 0)
            return ResultadoAuth<string>.Fallo($"Espera {espera} segundos antes de pedir otro código.");

        var nuevoCodigo = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        var nuevo = pendiente with
        {
            Codigo = nuevoCodigo,
            Expira = ahora.AddMinutes(MinutosCodigo),
            Intentos = 0,
            UltimoEnvio = ahora
        };
        _cache.Set(ClaveCache(correo), nuevo, nuevo.Expira);

        var enviado = await _correo.EnviarCodigoAsync(correo, pendiente.Username, nuevoCodigo);
        if (!enviado)
        {
            if (_env.IsDevelopment())
                return ResultadoAuth<string>.Ok($"No se pudo enviar el correo (modo desarrollo). Código de prueba: {nuevoCodigo}");
            return ResultadoAuth<string>.Fallo("No pudimos enviar el correo. Intenta de nuevo en unos minutos.");
        }

        return ResultadoAuth<string>.Ok("Te enviamos un nuevo código.");
    }

    // =====================================================
    //  4) LOGIN (con correo o con nombre de usuario)
    // =====================================================
    public async Task<ResultadoAuth<SesionRespuesta>> LoginAsync(LoginSolicitudDto datos)
    {
        var identificador = (datos.Correo ?? string.Empty).Trim();
        var clave = datos.Contrasena ?? string.Empty;

        var usuario = await _db.Usuarios
            .FirstOrDefaultAsync(u => u.Email == identificador.ToLower() || u.Username == identificador);

        if (usuario is null || !VerificarClave(clave, usuario.PasswordHash))
            return ResultadoAuth<SesionRespuesta>.Fallo("Usuario o contraseña incorrectos.");

        var rol = await _db.Roles.FirstOrDefaultAsync(r => r.RolId == usuario.RolId);

        return ResultadoAuth<SesionRespuesta>.Ok(CrearSesion(usuario, rol?.Nombre ?? RolJugador));
    }

    // =====================================================
    //  Ayudas internas
    // =====================================================
    private SesionRespuesta CrearSesion(Usuario usuario, string rol) => new()
    {
        Token = _jwt.Generar(usuario.UsuarioId, usuario.Username, rol),
        IdUsuario = usuario.UsuarioId,
        Nombre = usuario.Username,
        Rol = rol
    };

    private static string ClaveCache(string correo) => $"registro:{correo}";

    private static bool CorreoValido(string correo)
    {
        try { return new MailAddress(correo).Address == correo; }
        catch { return false; }
    }

    // Busca hasta 3 nombres parecidos que NO estén ocupados
    private async Task<List<string>> GenerarSugerenciasAsync(string nombre)
    {
        var raiz = nombre.Length > 14 ? nombre[..14] : nombre; // deja espacio para el sufijo (máx. 20)
        var sugerencias = new List<string>();

        for (int intento = 0; intento < 5 && sugerencias.Count < 3; intento++)
        {
            var candidatos = new List<string>
            {
                $"{raiz}{Random.Shared.Next(10, 100)}",
                $"{raiz}_{Random.Shared.Next(100, 1000)}",
                $"{raiz}.tank",
                $"Tank_{raiz}",
                $"{raiz}_Pro",
                $"{raiz}{Random.Shared.Next(1000, 10000)}"
            }
            .Where(c => c.Length <= 20)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

            var ocupados = await _db.Usuarios
                .Where(u => candidatos.Contains(u.Username))
                .Select(u => u.Username)
                .ToListAsync();

            foreach (var c in candidatos.Except(ocupados, StringComparer.OrdinalIgnoreCase))
            {
                if (!sugerencias.Contains(c, StringComparer.OrdinalIgnoreCase))
                    sugerencias.Add(c);
                if (sugerencias.Count == 3) break;
            }
        }

        return sugerencias;
    }

    // Contraseñas: nunca se guardan en texto plano (PBKDF2 con sal)
    private static string HashearClave(string clave)
    {
        const int iteraciones = 100_000;
        var sal = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(clave, sal, iteraciones, HashAlgorithmName.SHA256, 32);
        return $"v1.{iteraciones}.{Convert.ToBase64String(sal)}.{Convert.ToBase64String(hash)}";
    }

    private static bool VerificarClave(string clave, string guardado)
    {
        try
        {
            var partes = guardado.Split('.');
            if (partes.Length != 4 || partes[0] != "v1" || !int.TryParse(partes[1], out var iteraciones))
                return false;

            var sal = Convert.FromBase64String(partes[2]);
            var esperado = Convert.FromBase64String(partes[3]);
            var hash = Rfc2898DeriveBytes.Pbkdf2(clave, sal, iteraciones, HashAlgorithmName.SHA256, esperado.Length);
            return CryptographicOperations.FixedTimeEquals(hash, esperado);
        }
        catch
        {
            return false;
        }
    }
}