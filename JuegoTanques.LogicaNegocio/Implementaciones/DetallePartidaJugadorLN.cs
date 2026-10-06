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
    public class DetallePartidaJugadorLN : IDetallePartidaJugadorLN
    {
        private readonly IUnidadTrabajoEF _unidadTrabajo;
        private readonly IMapper _mapper;

        public DetallePartidaJugadorLN(IUnidadTrabajoEF unidadTrabajo, IMapper mapper)
        {
            _unidadTrabajo = unidadTrabajo;
            _mapper = mapper;
        }

        public async Task<Respuesta<TDetallePartidaJugador>> InsertarAsync(TDetallePartidaJugador modelo)
        {
            if (modelo == null)
                return Respuesta<TDetallePartidaJugador>.Fail("Los datos son requeridos.");

            DetallePartidaJugador entidad = _mapper.Map<DetallePartidaJugador>(modelo);

            var respuestaAD = await _unidadTrabajo.TDetallePartidaJugador.InsertarAsync(entidad);

            if (!respuestaAD.Success)
                return Respuesta<TDetallePartidaJugador>.Fail(respuestaAD.Error);

            return Respuesta<TDetallePartidaJugador>.Ok(_mapper.Map<TDetallePartidaJugador>(respuestaAD.Data));
        }

        public async Task<Respuesta<TDetallePartidaJugador>> ModificarAsync(TDetallePartidaJugador modelo)
        {
            if (modelo == null)
                return Respuesta<TDetallePartidaJugador>.Fail("Los datos son requeridos.");

            var buscar = await _unidadTrabajo.TDetallePartidaJugador
                .ObtenerEntidadAsync(x => x.DetalleId == modelo.DetalleId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<TDetallePartidaJugador>.Fail("Detalle de partida del jugador no encontrado.");

            _mapper.Map(modelo, buscar.Data);

            var respuestaAD = await _unidadTrabajo.TDetallePartidaJugador.ModificarAsync(buscar.Data);

            if (!respuestaAD.Success)
                return Respuesta<TDetallePartidaJugador>.Fail(respuestaAD.Error);

            return Respuesta<TDetallePartidaJugador>.Ok(_mapper.Map<TDetallePartidaJugador>(respuestaAD.Data));
        }

        public async Task<Respuesta<bool>> EliminarAsync(int detalleId)
        {
            var buscar = await _unidadTrabajo.TDetallePartidaJugador
                .ObtenerEntidadAsync(x => x.DetalleId == detalleId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<bool>.Fail("Detalle de partida del jugador no encontrado.");

            return await _unidadTrabajo.TDetallePartidaJugador.EliminarAsync(buscar.Data);
        }

        public async Task<Respuesta<TDetallePartidaJugador>> ObtenerPorIdAsync(int detalleId)
        {
            var respuestaAD = await _unidadTrabajo.TDetallePartidaJugador
                .ObtenerEntidadAsync(x => x.DetalleId == detalleId);

            if (!respuestaAD.Success || respuestaAD.Data == null)
                return Respuesta<TDetallePartidaJugador>.Fail("Detalle de partida del jugador no encontrado.");

            return Respuesta<TDetallePartidaJugador>.Ok(_mapper.Map<TDetallePartidaJugador>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TDetallePartidaJugador>>> ListarAsync()
        {
            var respuestaAD = await _unidadTrabajo.TDetallePartidaJugador.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TDetallePartidaJugador>>.Fail(respuestaAD.Error);

            return Respuesta<IEnumerable<TDetallePartidaJugador>>.Ok(
                _mapper.Map<IEnumerable<TDetallePartidaJugador>>(respuestaAD.Data));
        }
    }
}