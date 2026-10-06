using AutoMapper;
using JuegoTanques.Dominio.Entidades;
using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Dominio.InterfacesAD;
using JuegoTanques.Dominio.InterfacesLN;
using JuegoTanques.Utilitarios;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace JuegoTanques.LogicaNegocio.Implementaciones
{
    public class UsuarioLN : IUsuarioLN
    {
        private readonly IUnidadTrabajoEF _unidadTrabajo;
        private readonly IMapper _mapper;

        public UsuarioLN(IUnidadTrabajoEF unidadTrabajo, IMapper mapper)
        {
            _unidadTrabajo = unidadTrabajo;
            _mapper = mapper;
        }

        public async Task<Respuesta<TUsuario>> InsertarAsync(TUsuario usuario)
        {
            if (usuario == null)
                return Respuesta<TUsuario>.Fail("Los datos del usuario son requeridos.");

            Usuario entidad = _mapper.Map<Usuario>(usuario);

            var respuestaAD = await _unidadTrabajo.TUsuario.InsertarAsync(entidad);

            if (!respuestaAD.Success)
                return Respuesta<TUsuario>.Fail(respuestaAD.Error);

            return Respuesta<TUsuario>.Ok(_mapper.Map<TUsuario>(respuestaAD.Data));
        }

        public async Task<Respuesta<TUsuario>> ModificarAsync(TUsuario usuario)
        {
            if (usuario == null)
                return Respuesta<TUsuario>.Fail("Los datos del usuario son requeridos.");

            var buscar = await _unidadTrabajo.TUsuario
                .ObtenerEntidadAsync(x => x.UsuarioId == usuario.UsuarioId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<TUsuario>.Fail("Usuario no encontrado.");

            // Importante: en el perfil de AutoMapper usa .Ignore() para campos
            // que no deben cambiar (contraseña, fecha de creación, etc.).
            _mapper.Map(usuario, buscar.Data);

            var respuestaAD = await _unidadTrabajo.TUsuario.ModificarAsync(buscar.Data);

            if (!respuestaAD.Success)
                return Respuesta<TUsuario>.Fail(respuestaAD.Error);

            return Respuesta<TUsuario>.Ok(_mapper.Map<TUsuario>(respuestaAD.Data));
        }

        public async Task<Respuesta<bool>> EliminarAsync(int usuarioId)
        {
            var buscar = await _unidadTrabajo.TUsuario
                .ObtenerEntidadAsync(x => x.UsuarioId == usuarioId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<bool>.Fail("Usuario no encontrado.");

            return await _unidadTrabajo.TUsuario.EliminarAsync(buscar.Data);
        }

        public async Task<Respuesta<TUsuario>> ObtenerPorIdAsync(int usuarioId)
        {
            var respuestaAD = await _unidadTrabajo.TUsuario
                .ObtenerEntidadAsync(x => x.UsuarioId == usuarioId);

            if (!respuestaAD.Success || respuestaAD.Data == null)
                return Respuesta<TUsuario>.Fail("Usuario no encontrado.");

            return Respuesta<TUsuario>.Ok(_mapper.Map<TUsuario>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TUsuario>>> ListarAsync()
        {
            var respuestaAD = await _unidadTrabajo.TUsuario.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TUsuario>>.Fail(respuestaAD.Error);

            return Respuesta<IEnumerable<TUsuario>>.Ok(
                _mapper.Map<IEnumerable<TUsuario>>(respuestaAD.Data));
        }
    }
}