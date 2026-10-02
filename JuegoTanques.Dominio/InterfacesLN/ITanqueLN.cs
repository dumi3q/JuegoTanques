using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface ITanqueLN
    {
        Respuesta<TTanque> Insertar(TTanque clase);
        Respuesta<TTanque> Modificar(TTanque clase);
        Respuesta<bool> Eliminar(TTanque pedido);
        Respuesta<IEnumerable<TTanque>> Obtener(TTanque clase);
        Respuesta<TTanque> Buscar(TTanque clase);
        Respuesta<IEnumerable<TTanque>> Listar();
    }
}
