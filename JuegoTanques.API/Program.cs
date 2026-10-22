using JuegoTanques.AccesoDatos.Contexto;
using JuegoTanques.AccesoDatos.Implementacione;
using JuegoTanques.Dominio.InterfacesAD;
using JuegoTanques.Dominio.InterfacesLN;
using JuegoTanques.Dominio.DTO;
using JuegoTanques.LogicaNegocio.Implementaciones;
using Microsoft.EntityFrameworkCore;

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

app.Run();
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
