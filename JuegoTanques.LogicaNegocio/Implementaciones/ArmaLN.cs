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
    public class ArmaLN : IArmaLN
    {
        private readonly IUnidadTrabajoEF _unidadTrabajo;
        private readonly IMapper _mapper;

        public ArmaLN(IUnidadTrabajoEF unidadTrabajo, IMapper mapper)
        {
            _unidadTrabajo = unidadTrabajo;
            _mapper = mapper;
        }

        public async Task<Respuesta<TArma>> InsertarAsync(TArma modelo)
        {
            if (modelo == null)
                return Respuesta<TArma>.Fail("Los datos son requeridos.");

            Arma entidad = _mapper.Map<Arma>(modelo);

            var respuestaAD = await _unidadTrabajo.TArma.InsertarAsync(entidad);

            if (!respuestaAD.Success)
                return Respuesta<TArma>.Fail(respuestaAD.Error);

            return Respuesta<TArma>.Ok(_mapper.Map<TArma>(respuestaAD.Data));
        }

        public async Task<Respuesta<TArma>> ModificarAsync(TArma modelo)
        {
            if (modelo == null)
                return Respuesta<TArma>.Fail("Los datos son requeridos.");

            var buscar = await _unidadTrabajo.TArma
                .ObtenerEntidadAsync(x => x.ArmaId == modelo.ArmaId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<TArma>.Fail("Arma no encontrada.");

            _mapper.Map(modelo, buscar.Data);

            var respuestaAD = await _unidadTrabajo.TArma.ModificarAsync(buscar.Data);

            if (!respuestaAD.Success)
                return Respuesta<TArma>.Fail(respuestaAD.Error);

            return Respuesta<TArma>.Ok(_mapper.Map<TArma>(respuestaAD.Data));
        }

        public async Task<Respuesta<bool>> EliminarAsync(int armaId)
        {
            var buscar = await _unidadTrabajo.TArma
                .ObtenerEntidadAsync(x => x.ArmaId == armaId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<bool>.Fail("Arma no encontrada.");

            return await _unidadTrabajo.TArma.EliminarAsync(buscar.Data);
        }

        public async Task<Respuesta<TArma>> ObtenerPorIdAsync(int armaId)
        {
            var respuestaAD = await _unidadTrabajo.TArma
                .ObtenerEntidadAsync(x => x.ArmaId == armaId);

            if (!respuestaAD.Success || respuestaAD.Data == null)
                return Respuesta<TArma>.Fail("Arma no encontrada.");

            return Respuesta<TArma>.Ok(_mapper.Map<TArma>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TArma>>> ListarAsync()
        {
            var respuestaAD = await _unidadTrabajo.TArma.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TArma>>.Fail(respuestaAD.Error);

            return Respuesta<IEnumerable<TArma>>.Ok(
                _mapper.Map<IEnumerable<TArma>>(respuestaAD.Data));
        }
    }
}