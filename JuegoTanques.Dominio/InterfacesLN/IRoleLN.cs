using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IRoleLN
    {
        Respuesta<TRole> Insertar(TRole clase);
        Respuesta<TRole> Modificar(TRole clase);
        Respuesta<bool> Eliminar(TRole pedido);
        Respuesta<IEnumerable<TRole>> Obtener(TRole clase);
        Respuesta<TRole> Buscar(TRole clase);
        Respuesta<IEnumerable<TRole>> Listar();
    }
}
