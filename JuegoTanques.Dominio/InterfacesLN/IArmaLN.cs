using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IArmaLN
    {
        Respuesta<TArma> Insertar(TArma clase);
        Respuesta<TArma> Modificar(TArma clase);
        Respuesta<bool> Eliminar(TArma pedido);
        Respuesta<IEnumerable<TArma>> Obtener(TArma clase);
        Respuesta<TArma> Buscar(TArma clase);
        Respuesta<IEnumerable<TArma>> Listar();

    }
}
