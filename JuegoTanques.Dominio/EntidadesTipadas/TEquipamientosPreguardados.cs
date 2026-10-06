using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.EntidadesTipadas
{
    public class TEquipamientosPreguardados
    {
        public int PresetId { get; set; }

        public int UsuarioId { get; set; }

        public int NumeroSlot { get; set; }

        public string? NombrePreset { get; set; }

        public int TanqueId { get; set; }

        public int ArmaId { get; set; }

        public bool? EsActivo { get; set; }
    }
}
