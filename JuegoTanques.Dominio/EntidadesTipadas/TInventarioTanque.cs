using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.EntidadesTipadas
{
    public class TInventarioTanque
    {
        public int UsuarioId { get; set; }

        public int TanqueId { get; set; }

        public DateTime? FechaAdquisicion { get; set; }
    }
}
