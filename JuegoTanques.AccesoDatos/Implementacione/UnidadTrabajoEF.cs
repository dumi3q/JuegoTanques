using JuegoTanques.Dominio.InterfacesAD;
using Microsoft.EntityFrameworkCore.Storage;
using System;
using System.Collections.Generic;
using System.Text;
using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.AccesoDatos.Contexto;
using JuegoTanques.Dominio.Entidades;
using JuegoTanques.Dominio.EntidadesTipadas;
using Microsoft.EntityFrameworkCore;
namespace JuegoTanques.AccesoDatos.Implementacione
{
    public class UnidadTrabajoEF : IUnidadTrabajoEF
    {
        private readonly JuegoTanquesContext _contexto;

        private IDbContextTransaction? _transaccion;


        public IRepositorioAD<Arma> TArma{ get; }

        public IRepositorioAD<DetallePartidaJugador> TDetallePartidaJugador { get; }

        public IRepositorioAD<EquipamientosPreguardados> TEquipamientosPreguardados { get; }

        public IRepositorioAD<InventarioTanque> TInventarioTanque{ get; }

        public IRepositorioAD<Partida> TPartida { get; }

        public IRepositorioAD<Tanque> TTanque{ get; }

        public IRepositorioAD<Usuario> TUsuario { get; }

        public IRepositorioAD<Role> TRole{ get; }


        public UnidadTrabajoEF(
            JuegoTanquesContext contexto)
        {
            _contexto = contexto;

            TArma =
                new RepositorioAD<Arma>(_contexto);

            TDetallePartidaJugador =
                new RepositorioAD<DetallePartidaJugador>(_contexto);

            TEquipamientosPreguardados =
                new RepositorioAD<EquipamientosPreguardados>(_contexto);

            TInventarioTanque =
                new RepositorioAD<InventarioTanque>(_contexto);

            TPartida =
                new RepositorioAD<Partida>(_contexto);

            TRole =
                new RepositorioAD<Role>(_contexto);

            TTanque =
                new RepositorioAD<Tanque>(_contexto);

            TUsuario =
                new RepositorioAD<Usuario>(_contexto);
        }


        public int Completar()
        {
            return _contexto.SaveChanges();
        }


        public void EmpezarTransaccion()
        {
            _transaccion =
                _contexto.Database.BeginTransaction();
        }


        public void CompletarTran()
        {
            if (_transaccion != null)
            {
                _transaccion.Commit();
                _transaccion.Dispose();
                _transaccion = null;
            }
        }


        public void Rollback()
        {
            if (_transaccion != null)
            {
                _transaccion.Rollback();
                _transaccion.Dispose();
                _transaccion = null;
            }
        }


        public void CerrarConexion()
        {
            _contexto.Database.CloseConnection();
        }


        public void Dispose()
        {
            _transaccion?.Dispose();
            _contexto.Dispose();
        }
    }

}
