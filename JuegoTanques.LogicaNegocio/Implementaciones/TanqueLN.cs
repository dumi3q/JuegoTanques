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
    public class TanqueLN : ITanqueLN
    {
        private readonly IUnidadTrabajoEF _unidadTrabajo;
        private readonly IMapper _mapper;

        public TanqueLN(IUnidadTrabajoEF unidadTrabajo, IMapper mapper)
        {
            _unidadTrabajo = unidadTrabajo;
            _mapper = mapper;
        }

        public async Task<Respuesta<TTanque>> InsertarAsync(TTanque modelo)
        {
            if (modelo == null)
                return Respuesta<TTanque>.Fail("Los datos son requeridos.");

            Tanque entidad = _mapper.Map<Tanque>(modelo);

            var respuestaAD = await _unidadTrabajo.TTanque.InsertarAsync(entidad);

            if (!respuestaAD.Success)
                return Respuesta<TTanque>.Fail(respuestaAD.Error);

            return Respuesta<TTanque>.Ok(_mapper.Map<TTanque>(respuestaAD.Data));
        }

        public async Task<Respuesta<TTanque>> ModificarAsync(TTanque modelo)
        {
            if (modelo == null)
                return Respuesta<TTanque>.Fail("Los datos son requeridos.");

            var buscar = await _unidadTrabajo.TTanque
                .ObtenerEntidadAsync(x => x.TanqueId == modelo.TanqueId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<TTanque>.Fail("Tanque no encontrado.");

            _mapper.Map(modelo, buscar.Data);

            var respuestaAD = await _unidadTrabajo.TTanque.ModificarAsync(buscar.Data);

            if (!respuestaAD.Success)
                return Respuesta<TTanque>.Fail(respuestaAD.Error);

            return Respuesta<TTanque>.Ok(_mapper.Map<TTanque>(respuestaAD.Data));
        }

        public async Task<Respuesta<bool>> EliminarAsync(int tanqueId)
        {
            var buscar = await _unidadTrabajo.TTanque
                .ObtenerEntidadAsync(x => x.TanqueId == tanqueId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<bool>.Fail("Tanque no encontrado.");

            return await _unidadTrabajo.TTanque.EliminarAsync(buscar.Data);
        }

        public async Task<Respuesta<TTanque>> ObtenerPorIdAsync(int tanqueId)
        {
            var respuestaAD = await _unidadTrabajo.TTanque
                .ObtenerEntidadAsync(x => x.TanqueId == tanqueId);

            if (!respuestaAD.Success || respuestaAD.Data == null)
                return Respuesta<TTanque>.Fail("Tanque no encontrado.");

            return Respuesta<TTanque>.Ok(_mapper.Map<TTanque>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TTanque>>> ListarAsync()
        {
            var respuestaAD = await _unidadTrabajo.TTanque.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TTanque>>.Fail(respuestaAD.Error);

            return Respuesta<IEnumerable<TTanque>>.Ok(
                _mapper.Map<IEnumerable<TTanque>>(respuestaAD.Data));
        }
    }
}