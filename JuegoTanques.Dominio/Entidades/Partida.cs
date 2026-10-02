using System;
using System.Collections.Generic;


namespace JuegoTanques.Dominio.Entidades;

public partial class Partida
{
    public int PartidaId { get; set; }

    public string ModoJuego { get; set; } = null!;

    public DateTime? FechaInicio { get; set; }

    public DateTime? FechaFin { get; set; }

    public int? DuracionSegundos { get; set; }

    public virtual ICollection<DetallePartidaJugador> DetallePartidaJugadors { get; set; } = new List<DetallePartidaJugador>();
}
