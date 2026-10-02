using System;
using System.Collections.Generic;

namespace JuegoTanques.Dominio.Entidades;

public partial class Arma
{
    public int ArmaId { get; set; }

    public string Nombre { get; set; } = null!;

    public int DanioBase { get; set; }

    public double CadenciaFuego { get; set; }

    public double VelocidadProyectil { get; set; }

    public int Precio { get; set; }

    public virtual ICollection<EquipamientosPreguardado> EquipamientosPreguardados { get; set; } = new List<EquipamientosPreguardado>();
}
