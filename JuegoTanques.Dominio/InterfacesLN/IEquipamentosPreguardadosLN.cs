using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IEquipamentosPreguardadosLN
    {
        Task<Respuesta<TEquipamientosPreguardados>> InsertarAsync(TEquipamientosPreguardados preset
            );
        Task<Respuesta<TEquipamientosPreguardados>> ModificarAsync(TEquipamientosPreguardados preset);
        Task<Respuesta<bool>> EliminarAsync(int presetid);
        Task<Respuesta<TEquipamientosPreguardados>> ObtenerPorIdAsync(int presetid  );
        Task<Respuesta<IEnumerable<TEquipamientosPreguardados>>> ListarAsync();
    }
}
