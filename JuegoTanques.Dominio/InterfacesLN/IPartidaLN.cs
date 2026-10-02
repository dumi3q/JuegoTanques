using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IPartidaLN
    {
        Respuesta<TPartida> Insertar(TPartida clase);
        Respuesta<TPartida> Modificar(TPartida clase);
        Respuesta<bool> Eliminar(TPartida pedido);
        Respuesta<IEnumerable<TPartida>> Obtener(TPartida clase);
        Respuesta<TPartida> Buscar(TPartida clase);
        Respuesta<IEnumerable<TPartida>> Listar();
    }
}
