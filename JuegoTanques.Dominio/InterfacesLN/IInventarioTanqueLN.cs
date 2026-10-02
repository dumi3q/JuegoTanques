using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IInventarioTanqueLN
    {
        Respuesta<TInventarioTanque> Insertar(TInventarioTanque clase);
        Respuesta<TInventarioTanque> Modificar(TInventarioTanque clase);
        Respuesta<bool> Eliminar(TInventarioTanque pedido);
        Respuesta<IEnumerable<TInventarioTanque>> Obtener(TInventarioTanque clase);
        Respuesta<TInventarioTanque> Buscar(TInventarioTanque clase);
        Respuesta<IEnumerable<TInventarioTanque>> Listar();
    }
}
