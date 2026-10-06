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
    public class RoleLN : IRoleLN
    {
        private readonly IUnidadTrabajoEF _unidadTrabajo;
        private readonly IMapper _mapper;

        public RoleLN(IUnidadTrabajoEF unidadTrabajo, IMapper mapper)
        {
            _unidadTrabajo = unidadTrabajo;
            _mapper = mapper;
        }

        public async Task<Respuesta<TRole>> InsertarAsync(TRole modelo)
        {
            if (modelo == null)
                return Respuesta<TRole>.Fail("Los datos son requeridos.");

            Role entidad = _mapper.Map<Role>(modelo);

            var respuestaAD = await _unidadTrabajo.TRole.InsertarAsync(entidad);

            if (!respuestaAD.Success)
                return Respuesta<TRole>.Fail(respuestaAD.Error);

            return Respuesta<TRole>.Ok(_mapper.Map<TRole>(respuestaAD.Data));
        }

        public async Task<Respuesta<TRole>> ModificarAsync(TRole modelo)
        {
            if (modelo == null)
                return Respuesta<TRole>.Fail("Los datos son requeridos.");

            var buscar = await _unidadTrabajo.TRole
                .ObtenerEntidadAsync(x => x.RolId == modelo.RolId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<TRole>.Fail("Role no encontrado.");

            _mapper.Map(modelo, buscar.Data);

            var respuestaAD = await _unidadTrabajo.TRole.ModificarAsync(buscar.Data);

            if (!respuestaAD.Success)
                return Respuesta<TRole>.Fail(respuestaAD.Error);

            return Respuesta<TRole>.Ok(_mapper.Map<TRole>(respuestaAD.Data));
        }

        public async Task<Respuesta<bool>> EliminarAsync(int rolId)
        {
            var buscar = await _unidadTrabajo.TRole
                .ObtenerEntidadAsync(x => x.RolId == rolId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<bool>.Fail("Role no encontrado.");

            return await _unidadTrabajo.TRole.EliminarAsync(buscar.Data);
        }

        public async Task<Respuesta<TRole>> ObtenerPorIdAsync(int rolId)
        {
            var respuestaAD = await _unidadTrabajo.TRole
                .ObtenerEntidadAsync(x => x.RolId == rolId);

            if (!respuestaAD.Success || respuestaAD.Data == null)
                return Respuesta<TRole>.Fail("Role no encontrado.");

            return Respuesta<TRole>.Ok(_mapper.Map<TRole>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TRole>>> ListarAsync()
        {
            var respuestaAD = await _unidadTrabajo.TRole.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TRole>>.Fail(respuestaAD.Error);

            return Respuesta<IEnumerable<TRole>>.Ok(
                _mapper.Map<IEnumerable<TRole>>(respuestaAD.Data));
        }
    }
}