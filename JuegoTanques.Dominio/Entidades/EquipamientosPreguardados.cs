using System;
using System.Collections.Generic;


namespace JuegoTanques.Dominio.Entidades;

public partial class EquipamientosPreguardados
{
    public int PresetId { get; set; }

    public int UsuarioId { get; set; }

    public int NumeroSlot { get; set; }

    public string? NombrePreset { get; set; }

    public int TanqueId { get; set; }

    public int ArmaId { get; set; }

    public bool? EsActivo { get; set; }

    public virtual Arma Arma { get; set; } = null!;

    public virtual Tanque Tanque { get; set; } = null!;

    public virtual Usuario Usuario { get; set; } = null!;
}
