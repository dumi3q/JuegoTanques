using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.EntidadesTipadas
{
    public class TTanque
    {
        public int TanqueId { get; set; }

        public string Nombre { get; set; } = null!;

        public int VidaBase { get; set; }

        public double VelocidadBase { get; set; }

        public int Blindaje { get; set; }

        public int Precio { get; set; }

    }
}
