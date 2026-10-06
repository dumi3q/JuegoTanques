using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IDetallePartidaJugadorLN
    {
        Task<Respuesta<TDetallePartidaJugador>> InsertarAsync(TDetallePartidaJugador modelo);
        Task<Respuesta<TDetallePartidaJugador>> ModificarAsync(TDetallePartidaJugador modelo);
        Task<Respuesta<bool>> EliminarAsync(int detalleId);
        Task<Respuesta<TDetallePartidaJugador>> ObtenerPorIdAsync(int detalleId);
        Task<Respuesta<IEnumerable<TDetallePartidaJugador>>> ListarAsync();
    }
}