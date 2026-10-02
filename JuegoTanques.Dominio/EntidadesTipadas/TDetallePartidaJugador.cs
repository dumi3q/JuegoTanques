using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.EntidadesTipadas
{
    public class TDetallePartidaJugador
    {
        public int DetalleId { get; set; }

        public int PartidaId { get; set; }

        public int UsuarioId { get; set; }

        public int? TanquesDestruidos { get; set; }

        public int? DanoInfligido { get; set; }

        public int? PosicionFinal { get; set; }

        public int? MonedasGanadas { get; set; }

        public int? XpGanada { get; set; }
    }
}
