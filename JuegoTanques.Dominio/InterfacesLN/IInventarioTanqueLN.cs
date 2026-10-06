using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IInventarioTanqueLN
    {
        Task<Respuesta<TInventarioTanque>> InsertarAsync(TInventarioTanque modelo);
        Task<Respuesta<TInventarioTanque>> ModificarAsync(TInventarioTanque modelo);
        Task<Respuesta<bool>> EliminarAsync(int usuarioId, int tanqueId);
        Task<Respuesta<TInventarioTanque>> ObtenerPorIdAsync(int usuarioId, int tanqueId);
        Task<Respuesta<IEnumerable<TInventarioTanque>>> ListarAsync();
        Task<Respuesta<IEnumerable<TInventarioTanque>>> ListarPorUsuarioAsync(int usuarioId);
    }
}