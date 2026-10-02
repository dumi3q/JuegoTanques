using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.EntidadesTipadas
{
    public class TUsuario
    {
        public int UsuarioId { get; set; }

        public string Username { get; set; } = null!;

        public string Email { get; set; } = null!;

        public string PasswordHash { get; set; } = null!;

        public int RolId { get; set; }

        public int Nivel { get; set; }

        public int Experiencia { get; set; }

        public int Monedas { get; set; }

        public DateTime? FechaRegistro { get; set; }
    }
}
