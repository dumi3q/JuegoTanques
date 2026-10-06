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
    public class EquipamentosPreguardadosLN : IEquipamentosPreguardadosLN
    {
        private readonly IUnidadTrabajoEF _unidadTrabajo;
        private readonly IMapper _mapper;

        public EquipamentosPreguardadosLN(IUnidadTrabajoEF unidadTrabajo, IMapper mapper)
        {
            _unidadTrabajo = unidadTrabajo;
            _mapper = mapper;
        }

        public async Task<Respuesta<TEquipamientosPreguardados>> InsertarAsync(TEquipamientosPreguardados modelo)
        {
            if (modelo == null)
                return Respuesta<TEquipamientosPreguardados>.Fail("Los datos son requeridos.");

            EquipamientosPreguardados entidad = _mapper.Map<EquipamientosPreguardados>(modelo);

            var respuestaAD = await _unidadTrabajo.TEquipamientosPreguardados.InsertarAsync(entidad);

            if (!respuestaAD.Success)
                return Respuesta<TEquipamientosPreguardados>.Fail(respuestaAD.Error);

            return Respuesta<TEquipamientosPreguardados>.Ok(_mapper.Map<TEquipamientosPreguardados>(respuestaAD.Data));
        }

        public async Task<Respuesta<TEquipamientosPreguardados>> ModificarAsync(TEquipamientosPreguardados modelo)
        {
            if (modelo == null)
                return Respuesta<TEquipamientosPreguardados>.Fail("Los datos son requeridos.");

            var buscar = await _unidadTrabajo.TEquipamientosPreguardados
                .ObtenerEntidadAsync(x => x.PresetId == modelo.PresetId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<TEquipamientosPreguardados>.Fail("Equipamiento preguardado no encontrado.");

            _mapper.Map(modelo, buscar.Data);

            var respuestaAD = await _unidadTrabajo.TEquipamientosPreguardados.ModificarAsync(buscar.Data);

            if (!respuestaAD.Success)
                return Respuesta<TEquipamientosPreguardados>.Fail(respuestaAD.Error);

            return Respuesta<TEquipamientosPreguardados>.Ok(_mapper.Map<TEquipamientosPreguardados>(respuestaAD.Data));
        }

        public async Task<Respuesta<bool>> EliminarAsync(int presetId)
        {
            var buscar = await _unidadTrabajo.TEquipamientosPreguardados
                .ObtenerEntidadAsync(x => x.PresetId == presetId);

            if (!buscar.Success || buscar.Data == null)
                return Respuesta<bool>.Fail("Equipamiento preguardado no encontrado.");

            return await _unidadTrabajo.TEquipamientosPreguardados.EliminarAsync(buscar.Data);
        }

        public async Task<Respuesta<TEquipamientosPreguardados>> ObtenerPorIdAsync(int presetId)
        {
            var respuestaAD = await _unidadTrabajo.TEquipamientosPreguardados
                .ObtenerEntidadAsync(x => x.PresetId == presetId);

            if (!respuestaAD.Success || respuestaAD.Data == null)
                return Respuesta<TEquipamientosPreguardados>.Fail("Equipamiento preguardado no encontrado.");

            return Respuesta<TEquipamientosPreguardados>.Ok(_mapper.Map<TEquipamientosPreguardados>(respuestaAD.Data));
        }

        public async Task<Respuesta<IEnumerable<TEquipamientosPreguardados>>> ListarAsync()
        {
            var respuestaAD = await _unidadTrabajo.TEquipamientosPreguardados.ListarAsync();

            if (!respuestaAD.Success)
                return Respuesta<IEnumerable<TEquipamientosPreguardados>>.Fail(respuestaAD.Error);

            return Respuesta<IEnumerable<TEquipamientosPreguardados>>.Ok(
                _mapper.Map<IEnumerable<TEquipamientosPreguardados>>(respuestaAD.Data));
        }
    }
}