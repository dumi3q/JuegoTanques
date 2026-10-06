using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IPartidaLN
    {
        Task<Respuesta<TPartida>> InsertarAsync(TPartida partida);
        Task<Respuesta<TPartida>> ModificarAsync(TPartida partida);
        Task<Respuesta<bool>> EliminarAsync(int partidaid);
        Task<Respuesta<TPartida>> ObtenerPorIdAsync(int partidaid);
        Task<Respuesta<IEnumerable<TPartida>>> ListarAsync();
    }
}
