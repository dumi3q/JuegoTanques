using System;
using System.Collections.Generic;

namespace JuegoTanques.Dominio.Entidades;

public partial class InventarioArma
{
    public int UsuarioId { get; set; }

    public int ArmaId { get; set; }

    public DateTime? FechaAdquisicion { get; set; }

    public virtual Arma Arma { get; set; } = null!;

    public virtual Usuario Usuario { get; set; } = null!;
}