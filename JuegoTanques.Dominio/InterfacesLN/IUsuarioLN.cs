using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IUsuarioLN
    {
        Task<Respuesta<TUsuario>> InsertarAsync(TUsuario usuario);
        Task<Respuesta<TUsuario>> ModificarAsync(TUsuario usuario);
        Task<Respuesta<bool>> EliminarAsync(int usuarioId);
        Task<Respuesta<TUsuario>> ObtenerPorIdAsync(int usuarioId);
        Task<Respuesta<IEnumerable<TUsuario>>> ListarAsync();
        Task<Respuesta<bool>> ActualizarFotoPerfilAsync(int usuarioId, string fotoBase64);
    }
}