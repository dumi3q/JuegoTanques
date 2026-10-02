using System;
using System.Collections.Generic;


namespace JuegoTanques.Dominio.Entidades;

public partial class Tanque
{
    public int TanqueId { get; set; }

    public string Nombre { get; set; } = null!;

    public int VidaBase { get; set; }

    public double VelocidadBase { get; set; }

    public int Blindaje { get; set; }

    public int Precio { get; set; }

    public virtual ICollection<EquipamientosPreguardados> EquipamientosPreguardados { get; set; } = new List<EquipamientosPreguardados>();

    public virtual ICollection<InventarioTanque> InventarioTanques { get; set; } = new List<InventarioTanque>();
}
