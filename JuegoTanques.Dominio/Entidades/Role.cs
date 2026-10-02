using System;
using System.Collections.Generic;


namespace JuegoTanques.Dominio.Entidades;

public partial class Role
{
    public int RolId { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
}
