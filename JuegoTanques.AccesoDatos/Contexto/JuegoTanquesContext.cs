using System;
using System.Collections.Generic;
using JuegoTanques.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace JuegoTanques.AccesoDatos.Contexto;

public partial class JuegoTanquesContext : DbContext
{
    public JuegoTanquesContext()
    {
    }

    public JuegoTanquesContext(DbContextOptions<JuegoTanquesContext> options)
        : base(options)
    {
    }
    public virtual DbSet<InventarioArma> InventarioArmas { get; set; }
    public virtual DbSet<Arma> Armas { get; set; }

    public virtual DbSet<DetallePartidaJugador> DetallePartidaJugadors { get; set; }

    public virtual DbSet<EquipamientosPreguardados> EquipamientosPreguardados { get; set; }

    public virtual DbSet<InventarioTanque> InventarioTanques { get; set; }

    public virtual DbSet<Partida> Partidas { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Tanque> Tanques { get; set; }

    public virtual DbSet<Usuario> Usuarios { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=.\\SQLEXPRESS01;Database=Tanques;Integrated Security=True;TrustServerCertificate=true;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Arma>(entity =>
        {
            entity.HasKey(e => e.ArmaId).HasName("PK__Armas__8D38573DFB72916A");

            entity.Property(e => e.ArmaId).HasColumnName("arma_id");
            entity.Property(e => e.CadenciaFuego).HasColumnName("cadencia_fuego");
            entity.Property(e => e.DanioBase).HasColumnName("danio_base");
            entity.Property(e => e.Nombre)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("nombre");
            entity.Property(e => e.Precio).HasColumnName("precio");
            entity.Property(e => e.VelocidadProyectil).HasColumnName("velocidad_proyectil");
        });

        modelBuilder.Entity<InventarioArma>(entity =>
        {
            entity.HasKey(e => new { e.UsuarioId, e.ArmaId });
            entity.ToTable("InventarioArmas");

            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");
            entity.Property(e => e.ArmaId).HasColumnName("arma_id");
            entity.Property(e => e.FechaAdquisicion).HasColumnType("datetime").HasColumnName("fecha_adquisicion");

            entity.HasOne(d => d.Arma).WithMany().HasForeignKey(d => d.ArmaId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("FK_InventarioArmas_Armas");
            entity.HasOne(d => d.Usuario).WithMany().HasForeignKey(d => d.UsuarioId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("FK_InventarioArmas_Usuarios");
        });

        modelBuilder.Entity<DetallePartidaJugador>(entity =>
        {
            entity.HasKey(e => e.DetalleId).HasName("PK__DetalleP__91B12E705AE126B2");

            entity.ToTable("DetallePartidaJugador");

            entity.Property(e => e.DetalleId).HasColumnName("detalle_id");
            entity.Property(e => e.DanoInfligido)
                .HasDefaultValue(0)
                .HasColumnName("dano_infligido");
            entity.Property(e => e.MonedasGanadas)
                .HasDefaultValue(0)
                .HasColumnName("monedas_ganadas");
            entity.Property(e => e.PartidaId).HasColumnName("partida_id");
            entity.Property(e => e.PosicionFinal)
                .HasDefaultValue(0)
                .HasColumnName("posicion_final");
            entity.Property(e => e.TanquesDestruidos)
                .HasDefaultValue(0)
                .HasColumnName("tanques_destruidos");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");
            entity.Property(e => e.XpGanada)
                .HasDefaultValue(0)
                .HasColumnName("xp_ganada");

            entity.HasOne(d => d.Partida).WithMany(p => p.DetallePartidaJugadors)
                .HasForeignKey(d => d.PartidaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Detalle_Partidas");

            entity.HasOne(d => d.Usuario).WithMany(p => p.DetallePartidaJugadors)
                .HasForeignKey(d => d.UsuarioId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Detalle_Usuarios");
        });

        modelBuilder.Entity<EquipamientosPreguardados>(entity =>
        {
            entity.HasKey(e => e.PresetId).HasName("PK__Equipami__01ED5E7E13501E63");

            entity.Property(e => e.PresetId).HasColumnName("preset_id");
            entity.Property(e => e.ArmaId).HasColumnName("arma_id");
            entity.Property(e => e.EsActivo)
                .HasDefaultValue(false)
                .HasColumnName("es_activo");
            entity.Property(e => e.NombrePreset)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasDefaultValue("Clase Personalizada")
                .HasColumnName("nombre_preset");
            entity.Property(e => e.NumeroSlot).HasColumnName("numero_slot");
            entity.Property(e => e.TanqueId).HasColumnName("tanque_id");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");

            entity.HasOne(d => d.Arma).WithMany(p => p.EquipamientosPreguardados)
                .HasForeignKey(d => d.ArmaId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Presets_Armas");

            entity.HasOne(d => d.Tanque).WithMany(p => p.EquipamientosPreguardados)
                .HasForeignKey(d => d.TanqueId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Presets_Tanques");

            entity.HasOne(d => d.Usuario).WithMany(p => p.EquipamientosPreguardados)
                .HasForeignKey(d => d.UsuarioId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Presets_Usuarios");
        });

        modelBuilder.Entity<InventarioTanque>(entity =>
        {
            entity.HasKey(e => new { e.UsuarioId, e.TanqueId }).HasName("PK__Inventar__8343B7087705B876");

            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");
            entity.Property(e => e.TanqueId).HasColumnName("tanque_id");
            entity.Property(e => e.FechaAdquisicion)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("fecha_adquisicion");

            entity.HasOne(d => d.Tanque).WithMany(p => p.InventarioTanques)
                .HasForeignKey(d => d.TanqueId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InvTanques_Tanques");

            entity.HasOne(d => d.Usuario).WithMany(p => p.InventarioTanques)
                .HasForeignKey(d => d.UsuarioId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InvTanques_Usuarios");
        });

        modelBuilder.Entity<Partida>(entity =>
        {
            entity.HasKey(e => e.PartidaId).HasName("PK__Partidas__5607FE4177C33111");

            entity.Property(e => e.PartidaId).HasColumnName("partida_id");
            entity.Property(e => e.DuracionSegundos).HasColumnName("duracion_segundos");
            entity.Property(e => e.FechaFin)
                .HasColumnType("datetime")
                .HasColumnName("fecha_fin");
            entity.Property(e => e.FechaInicio)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("fecha_inicio");
            entity.Property(e => e.ModoJuego)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("modo_juego");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RolId).HasName("PK__Roles__CF32E443B6EA7A45");

            entity.HasIndex(e => e.Nombre, "UQ__Roles__72AFBCC63231FA78").IsUnique();

            entity.Property(e => e.RolId).HasColumnName("rol_id");
            entity.Property(e => e.Nombre)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("nombre");
        });

        modelBuilder.Entity<Tanque>(entity =>
        {
            entity.HasKey(e => e.TanqueId).HasName("PK__Tanques__D9465A7B9469497F");

            entity.Property(e => e.TanqueId).HasColumnName("tanque_id");
            entity.Property(e => e.Blindaje).HasColumnName("blindaje");
            entity.Property(e => e.Nombre)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("nombre");
            entity.Property(e => e.Precio).HasColumnName("precio");
            entity.Property(e => e.VelocidadBase).HasColumnName("velocidad_base");
            entity.Property(e => e.VidaBase).HasColumnName("vida_base");
        });

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.UsuarioId).HasName("PK__Usuarios__2ED7D2AFEA6F4C6F");

            entity.HasIndex(e => e.Email, "UQ__Usuarios__AB6E616450847BDF").IsUnique();

            entity.HasIndex(e => e.Username, "UQ__Usuarios__F3DBC572D0628E92").IsUnique();

            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("email");
            entity.Property(e => e.Experiencia).HasColumnName("experiencia");
            entity.Property(e => e.FechaRegistro)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("fecha_registro");
            entity.Property(e => e.Monedas)
                .HasDefaultValue(100)
                .HasColumnName("monedas");
            entity.Property(e => e.Nivel)
                .HasDefaultValue(1)
                .HasColumnName("nivel");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("password_hash");
            entity.Property(e => e.RolId)
                .HasDefaultValue(1)
                .HasColumnName("rol_id");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("username");

            entity.HasOne(d => d.Rol).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.RolId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Usuarios_Roles");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
