using JuegoTanques.AccesoDatos.Contexto;
using JuegoTanques.AccesoDatos.Implementacione;
using JuegoTanques.API.Hubs;
using JuegoTanques.API.Servicios;
using JuegoTanques.Dominio.DTO;
using JuegoTanques.Dominio.InterfacesAD;
using JuegoTanques.Dominio.InterfacesLN;
using JuegoTanques.LogicaNegocio.Implementaciones;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

builder.Services.AddDbContext<JuegoTanquesContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAutoMapper(cfg => cfg.AddProfile<AutoMapperProfile>());
builder.Services.AddScoped<IUnidadTrabajoEF, UnidadTrabajoEF>();
builder.Services.AddScoped<IUsuarioLN, UsuarioLN>();
builder.Services.AddScoped<ITanqueLN, TanqueLN>();
builder.Services.AddScoped<IArmaLN, ArmaLN>();
builder.Services.AddScoped<IInventarioTanqueLN, InventarioTanqueLN>();
builder.Services.AddScoped<IPartidaLN, PartidaLN>();
builder.Services.AddScoped<IDetallePartidaJugadorLN, DetallePartidaJugadorLN>();
builder.Services.AddScoped<IEquipamentosPreguardadosLN, EquipamentosPreguardadosLN>();
builder.Services.AddScoped<IRoleLN, RoleLN>();
builder.Services.AddScoped<JuegoServicio>();
builder.Services.AddSingleton<SalasServicio>();
builder.Services.AddScoped<AuthServicio>();
builder.Services.AddScoped<ProgresoServicio>();
builder.Services.AddMemoryCache();

builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirIonic", policy =>
    {
        policy.WithOrigins(
                "http://localhost:8000", "https://localhost:8000",
                "http://localhost:8100", "https://localhost:8100",
                "http://localhost:8101", "https://localhost:8101"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddScoped<ICorreoServicio, CorreoServicio>();
builder.Services.AddSingleton<JwtServicio>();
builder.Services.AddScoped<AuthServicio>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opciones =>
    {
        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Emisor"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audiencia"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Clave"]!)),
            ValidateLifetime = true
        };

        opciones.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // 1. Revisar el query string (método estándar para WebSockets)
                var accessToken = context.Request.Query["access_token"];

                // 2. Si viene vacío, revisar la cabecera Authorization tradicional
                if (string.IsNullOrEmpty(accessToken))
                {
                    var authHeader = context.Request.Headers["Authorization"].ToString();
                    if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        accessToken = authHeader["Bearer ".Length..].Trim();
                    }
                }

                // 3. SOLUCIÓN DEFINITIVA: Si es una petición hacia el Hub de salas, inyectamos el token al contexto
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/salasHub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("PermitirIonic");
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
// 🟢 Mapeamos el Hub permitiendo que la negociación inicial pase sin bloquearse con 401
app.MapHub<SalasHub>("/salasHub");

app.Run();