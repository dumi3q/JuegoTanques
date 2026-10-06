using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IArmaLN
    {
        Task<Respuesta<TArma>> InsertarAsync(TArma modelo);
        Task<Respuesta<TArma>> ModificarAsync(TArma modelo);
        Task<Respuesta<bool>> EliminarAsync(int armaId);
        Task<Respuesta<TArma>> ObtenerPorIdAsync(int armaId);
        Task<Respuesta<IEnumerable<TArma>>> ListarAsync();
    }
}