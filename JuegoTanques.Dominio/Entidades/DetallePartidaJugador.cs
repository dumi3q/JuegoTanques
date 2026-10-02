using System;
using System.Collections.Generic;


namespace JuegoTanques.Dominio.Entidades;

public partial class DetallePartidaJugador
{
    public int DetalleId { get; set; }

    public int PartidaId { get; set; }

    public int UsuarioId { get; set; }

    public int? TanquesDestruidos { get; set; }

    public int? DanoInfligido { get; set; }

    public int? PosicionFinal { get; set; }

    public int? MonedasGanadas { get; set; }

    public int? XpGanada { get; set; }

    public virtual Partida Partida { get; set; } = null!;

    public virtual Usuario Usuario { get; set; } = null!;
}
