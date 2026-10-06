using AutoMapper;
using JuegoTanques.Dominio.Entidades;
using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Dominio.InterfacesAD;
using JuegoTanques.Dominio.InterfacesLN;
using JuegoTanques.Utilitarios;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JuegoTanques.LogicaNegocio.Implementaciones
{
    public class InventarioTanqueLN : IInventarioTanqueLN
    {
        private readonly IUnidadTrabajoEF _unidadTrabajo;
        private readonly IMapper _mapper;

        public InventarioTanqueLN(IUnidadTrabajoEF unidadTrabajo, IMapper mapper)
        {
            _unidadTrabajo = unidadTrabajo;
            _mapper = mapper;
        }

        public async Task<Respuesta<TInventarioTanque>> InsertarAsync(TInventarioTanque modelo)
        {
            if (modelo == null)
                return Respuesta<TInventarioTanque>.Fail("Los datos son requeridos.");

            // La clave es compuesta: un usuario no puede tener dos veces el mismo tanque.
            var existente = await _unidadTrabajo.TInventarioTanque
                .ObtenerEntidadAsync(x => x.UsuarioId == modelo.UsuarioId
                                       && x.TanqueId == modelo.TanqueId);

            if (existente.Success && existente.Data != null)
                return Respuesta<TInventarioTanque>.Fail("El usuario ya tiene este tanque en su inventario.");

            InventarioTanque entidad = _mapper.Map<InventarioTanque>(modelo);

            var respuestaAD = await _unidadTrabajo.TInventarioTanque.InsertarAsync(entidad);

            if (!respuestaAD.Success)
                return Respuesta<TInventarioTanque>.Fail(respuestaAD.Error);

            return Respuesta<TInventarioTanque>.Ok(_mapper.Map<TInventarioTanque>(respuestaAD.Data));
        }

        public async Task<Respuesta<TInventarioTanque>> ModificarAsync(TInventarioTanque modelo)
        {
            if (modelo == null)
                return Respuesta<TInventarioTanque>.Fail("Los datos son requeridos.");

            var buscar = await _unidadTrabajo.TInventarioTanque
                .ObtenerEntidadAsync(x => x.UsuarioId == modelo.UsuarioId
                                       && x.TanqueId == modelo.TanqueId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<TInventarioTanque>.Fail("Inventario de tanque no encontrado.");

            _mapper.Map(modelo, buscar.Data);

            var respuestaAD = await _unidadTrabajo.TInventarioTanque.ModificarAsync(buscar.Data);

            if (!respuestaAD.Success)
                return Respuesta<TInventarioTanque>.Fail(respuestaAD.Error);

            return Respuesta<TInventarioTanque>.Ok(_mapper.Map<TInventarioTanque>(respuestaAD.Data));
        }

        public async Task<Respuesta<bool>> EliminarAsync(int usuarioId, int tanqueId)
        {
            var buscar = await _unidadTrabajo.TInventarioTanque
                .ObtenerEntidadAsync(x => x.UsuarioId == usuarioId && x.TanqueId == tanqueId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<bool>.Fail("Inventario de tanque no encontrado.");

            return await _unidadTrabajo.TInventarioTanque.EliminarAsync(buscar.Data);
        }

        public async Task<Respuesta<TInventarioTanque>> ObtenerPorIdAsync(int usuarioId, int tanqueId)
        {
            var respuestaAD = await _unidadTrabajo.TInventarioTanque
                .ObtenerEntidadAsync(x => x.UsuarioId == usuarioId && x.TanqueId == tanqueId);

            if (!respuestaAD.Success || respuestaAD.Data == null)
                return Respuesta<TInventarioTanque>.Fail("Inventario de tanque no encontrado.");

            return Respuesta<TInventarioTanque>.Ok(_mapper.Map<TInventarioTanque>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TInventarioTanque>>> ListarAsync()
        {
            var respuestaAD = await _unidadTrabajo.TInventarioTanque.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TInventarioTanque>>.Fail(respuestaAD.Error);

            return Respuesta<IEnumerable<TInventarioTanque>>.Ok(
                _mapper.Map<IEnumerable<TInventarioTanque>>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TInventarioTanque>>> ListarPorUsuarioAsync(int usuarioId)
        {
            var respuestaAD = await _unidadTrabajo.TInventarioTanque.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TInventarioTanque>>.Fail(respuestaAD.Error);

            // Filtra en memoria; si tu repositorio tiene un listar con filtro, úsalo aquí.
            var delUsuario = respuestaAD.Data.Where(x => x.UsuarioId == usuarioId);

            return Respuesta<IEnumerable<TInventarioTanque>>.Ok(
                _mapper.Map<IEnumerable<TInventarioTanque>>(delUsuario));
        }
    }
}