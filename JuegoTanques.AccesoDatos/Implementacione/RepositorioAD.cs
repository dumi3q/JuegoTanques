using JuegoTanques.Utilitarios;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Text;
using JuegoTanques.Dominio.InterfacesAD;
namespace JuegoTanques.AccesoDatos.Implementacione
{
    public class RepositorioAD<TEntity> :IRepositorioAD<TEntity> 
        where TEntity : class
    {
        private readonly DbContext _contexto;
        private readonly DbSet<TEntity> _entidad;

        public RepositorioAD(DbContext contexto)
        {
            _contexto = contexto;
            _entidad = _contexto.Set<TEntity>();
        }

        public async Task<Respuesta<TEntity>> InsertarAsync(
            TEntity objEntidad)
        {
            try
            {
                await _entidad.AddAsync(objEntidad);
                await _contexto.SaveChangesAsync();

                return Respuesta<TEntity>.Ok(objEntidad);
            }
            catch (Exception ex)
            {
                return Respuesta<TEntity>.Fail(ex.Message);
            }
        }

        public async Task<Respuesta<TEntity>> ModificarAsync(
            TEntity objEntidad)
        {
            try
            {
                _entidad.Update(objEntidad);
                await _contexto.SaveChangesAsync();

                return Respuesta<TEntity>.Ok(objEntidad);
            }
            catch (Exception ex)
            {
                return Respuesta<TEntity>.Fail(ex.Message);
            }
        }

        public async Task<Respuesta<bool>> EliminarAsync(
            TEntity objEntidad)
        {
            try
            {
                _entidad.Remove(objEntidad);
                await _contexto.SaveChangesAsync();

                return Respuesta<bool>.Ok(true);
            }
            catch (Exception ex)
            {
                return Respuesta<bool>.Fail(ex.Message);
            }
        }

        public async Task<Respuesta<IEnumerable<TEntity>>> ListarAsync(
            List<string>? objIncludes = null)
        {
            try
            {
                IQueryable<TEntity> consulta = _entidad;

                if (objIncludes != null)
                {
                    foreach (string include in objIncludes)
                    {
                        consulta = consulta.Include(include);
                    }
                }

                var lista = await consulta.ToListAsync();

                return Respuesta<IEnumerable<TEntity>>.Ok(lista);
            }
            catch (Exception ex)
            {
                return Respuesta<IEnumerable<TEntity>>.Fail(ex.Message);
            }
        }

        public async Task<Respuesta<IEnumerable<TEntity>>> BuscarAsync(
            Expression<Func<TEntity, bool>> objPredicado,
            List<string>? objIncludes = null)
        {
            try
            {
                IQueryable<TEntity> consulta =
                    _entidad.Where(objPredicado);

                if (objIncludes != null)
                {
                    foreach (string include in objIncludes)
                    {
                        consulta = consulta.Include(include);
                    }
                }

                var lista = await consulta.ToListAsync();

                return Respuesta<IEnumerable<TEntity>>.Ok(lista);
            }
            catch (Exception ex)
            {
                return Respuesta<IEnumerable<TEntity>>.Fail(ex.Message);
            }
        }

        public async Task<Respuesta<TEntity>> ObtenerEntidadAsync(
            Expression<Func<TEntity, bool>> objPredicado,
            List<string>? objIncludes = null)
        {
            try
            {
                IQueryable<TEntity> consulta = _entidad;

                if (objIncludes != null)
                {
                    foreach (string include in objIncludes)
                    {
                        consulta = consulta.Include(include);
                    }
                }

                var entidad =
                    await consulta.FirstOrDefaultAsync(objPredicado);

                if (entidad == null)
                {
                    return Respuesta<TEntity>.Fail(
                        "No se encontró el registro.");
                }

                return Respuesta<TEntity>.Ok(entidad);
            }
            catch (Exception ex)
            {
                return Respuesta<TEntity>.Fail(ex.Message);
            }
        }

        public async Task<Respuesta<int?>> ContarAsync(
            Expression<Func<TEntity, bool>> objPredicado,
            List<string>? objIncludes = null)
        {
            try
            {
                IQueryable<TEntity> consulta = _entidad;

                if (objIncludes != null)
                {
                    foreach (string include in objIncludes)
                    {
                        consulta = consulta.Include(include);
                    }
                }

                int cantidad =
                    await consulta.CountAsync(objPredicado);

                return Respuesta<int?>.Ok(cantidad);
            }
            catch (Exception ex)
            {
                return Respuesta<int?>.Fail(ex.Message);
            }
        }
    }
}
