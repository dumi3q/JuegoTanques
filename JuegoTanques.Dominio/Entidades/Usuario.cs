using System;
using System.Collections.Generic;


namespace JuegoTanques.Dominio.Entidades;

public partial class Usuario
{
    public int UsuarioId { get; set; }

    public string Username { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public int RolId { get; set; }

    public int Nivel { get; set; }

    public int Experiencia { get; set; }

    public int Monedas { get; set; }

    public DateTime? FechaRegistro { get; set; }

    public virtual ICollection<DetallePartidaJugador> DetallePartidaJugadors { get; set; } = new List<DetallePartidaJugador>();

    public virtual ICollection<EquipamientosPreguardados> EquipamientosPreguardados { get; set; } = new List<EquipamientosPreguardados>();

    public virtual ICollection<InventarioTanque> InventarioTanques { get; set; } = new List<InventarioTanque>();

    public virtual Role Rol { get; set; } = null!;

    public string? FotoPerfil { get; set; }
}
