using System;
using System.Collections.Generic;


namespace JuegoTanques.Dominio.Entidades;

public partial class InventarioTanque
{
    public int UsuarioId { get; set; }

    public int TanqueId { get; set; }

    public DateTime? FechaAdquisicion { get; set; }

    public virtual Tanque Tanque { get; set; } = null!;

    public virtual Usuario Usuario { get; set; } = null!;
}
