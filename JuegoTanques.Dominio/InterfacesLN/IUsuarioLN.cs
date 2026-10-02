using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IUsuarioLN
    {
        Respuesta<TUsuario> Insertar(TUsuario clase);
        Respuesta<TUsuario> Modificar(TUsuario clase);
        Respuesta<bool> Eliminar(TUsuario pedido);
        Respuesta<IEnumerable<TUsuario>> Obtener(TUsuario clase);
        Respuesta<TUsuario> Buscar(TUsuario clase);
        Respuesta<IEnumerable<TUsuario>> Listar();
    }
}
