using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.EntidadesTipadas
{
    public class TArma
    {
        public int ArmaId { get; set; }

        public string Nombre { get; set; } = null!;

        public int DanioBase { get; set; }

        public double CadenciaFuego { get; set; }

        public double VelocidadProyectil { get; set; }

        public int Precio { get; set; }
    }
}
