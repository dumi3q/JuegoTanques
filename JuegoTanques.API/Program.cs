using JuegoTanques.AccesoDatos.Contexto;
using JuegoTanques.AccesoDatos.Implementacione;
using JuegoTanques.Dominio.InterfacesAD;
using JuegoTanques.Dominio.InterfacesLN;
using JuegoTanques.Dominio.DTO;
using JuegoTanques.LogicaNegocio.Implementaciones;
using Microsoft.EntityFrameworkCore;
using System.Text;
using JuegoTanques.API.Servicios;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
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
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirIonic", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();

builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICorreoServicio, CorreoServicio>();
builder.Services.AddSingleton<JwtServicio>();
builder.Services.AddScoped<AuthServicio>();

builder.Services.AddCors(o => o.AddPolicy("Front", p => p
    .SetIsOriginAllowed(_ => true)   // para desarrollo
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

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
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
app.UseCors("PermitirIonic");

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.UseAuthentication();

app.Run();
