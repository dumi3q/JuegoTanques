using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IDetallePartidaJugadorLN
    {
        Respuesta<TDetallePartidaJugador> Insertar(TDetallePartidaJugador clase);
        Respuesta<TDetallePartidaJugador> Modificar(TDetallePartidaJugador clase);
        Respuesta<bool> Eliminar(TDetallePartidaJugador pedido);
        Respuesta<IEnumerable<TDetallePartidaJugador>> Obtener(TDetallePartidaJugador clase);
        Respuesta<TDetallePartidaJugador> Buscar(TDetallePartidaJugador clase);
        Respuesta<IEnumerable<TDetallePartidaJugador>> Listar();
    }
}
