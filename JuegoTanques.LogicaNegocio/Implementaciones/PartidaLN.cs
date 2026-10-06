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
    public class PartidaLN : IPartidaLN
    {
        private readonly IUnidadTrabajoEF _unidadTrabajo;
        private readonly IMapper _mapper;

        public PartidaLN(IUnidadTrabajoEF unidadTrabajo, IMapper mapper)
        {
            _unidadTrabajo = unidadTrabajo;
            _mapper = mapper;
        }

        public async Task<Respuesta<TPartida>> InsertarAsync(TPartida modelo)
        {
            if (modelo == null)
                return Respuesta<TPartida>.Fail("Los datos son requeridos.");

            Partida entidad = _mapper.Map<Partida>(modelo);

            var respuestaAD = await _unidadTrabajo.TPartida.InsertarAsync(entidad);

            if (!respuestaAD.Success)
                return Respuesta<TPartida>.Fail(respuestaAD.Error);

            return Respuesta<TPartida>.Ok(_mapper.Map<TPartida>(respuestaAD.Data));
        }

        public async Task<Respuesta<TPartida>> ModificarAsync(TPartida modelo)
        {
            if (modelo == null)
                return Respuesta<TPartida>.Fail("Los datos son requeridos.");

            var buscar = await _unidadTrabajo.TPartida
                .ObtenerEntidadAsync(x => x.PartidaId == modelo.PartidaId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<TPartida>.Fail("Partida no encontrada.");

            _mapper.Map(modelo, buscar.Data);

            var respuestaAD = await _unidadTrabajo.TPartida.ModificarAsync(buscar.Data);

            if (!respuestaAD.Success)
                return Respuesta<TPartida>.Fail(respuestaAD.Error);

            return Respuesta<TPartida>.Ok(_mapper.Map<TPartida>(respuestaAD.Data));
        }

        public async Task<Respuesta<bool>> EliminarAsync(int partidaId)
        {
            var buscar = await _unidadTrabajo.TPartida
                .ObtenerEntidadAsync(x => x.PartidaId == partidaId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<bool>.Fail("Partida no encontrada.");

            return await _unidadTrabajo.TPartida.EliminarAsync(buscar.Data);
        }

        public async Task<Respuesta<TPartida>> ObtenerPorIdAsync(int partidaId)
        {
            var respuestaAD = await _unidadTrabajo.TPartida
                .ObtenerEntidadAsync(x => x.PartidaId == partidaId);

            if (!respuestaAD.Success || respuestaAD.Data == null)
                return Respuesta<TPartida>.Fail("Partida no encontrada.");

            return Respuesta<TPartida>.Ok(_mapper.Map<TPartida>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TPartida>>> ListarAsync()
        {
            var respuestaAD = await _unidadTrabajo.TPartida.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TPartida>>.Fail(respuestaAD.Error);

            return Respuesta<IEnumerable<TPartida>>.Ok(
                _mapper.Map<IEnumerable<TPartida>>(respuestaAD.Data));
        }
    }
}