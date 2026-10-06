using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface ITanqueLN
    {
        Task<Respuesta<TTanque>> InsertarAsync(TTanque tanque);
        Task<Respuesta<TTanque>> ModificarAsync(TTanque tanque);
        Task<Respuesta<bool>> EliminarAsync(int tanqueid);
        Task<Respuesta<TTanque>> ObtenerPorIdAsync(int tanqueid);
        Task<Respuesta<IEnumerable<TTanque>>> ListarAsync();
    }
}
