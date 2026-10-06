using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IRoleLN
    {
        Task<Respuesta<TRole>> InsertarAsync(TRole role);
        Task<Respuesta<TRole>> ModificarAsync(TRole role);
        Task<Respuesta<bool>> EliminarAsync(int roleid);
        Task<Respuesta<TRole>> ObtenerPorIdAsync(int roleid);
        Task<Respuesta<IEnumerable<TRole>>> ListarAsync();
    }
}
