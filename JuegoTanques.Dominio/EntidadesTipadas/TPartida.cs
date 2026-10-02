using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.EntidadesTipadas
{
    public class TPartida
    {
        public int PartidaId { get; set; }

        public string ModoJuego { get; set; } = null!;

        public DateTime? FechaInicio { get; set; }

        public DateTime? FechaFin { get; set; }

        public int? DuracionSegundos { get; set; }
    }
}
