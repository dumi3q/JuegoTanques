using JuegoTanques.Dominio.Entidades;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesAD
{
    public interface IUnidadTrabajoEF : IDisposable
    {
        IRepositorioAD<Arma> TArma { get; }
        IRepositorioAD<DetallePartidaJugador> TDetallePartidaJugador { get; }
        IRepositorioAD<EquipamientosPreguardados> TEquipamientosPreguardados { get; }
        IRepositorioAD<InventarioTanque> TInventarioTanques { get; }
        IRepositorioAD<Partida> TPartida { get; }
        IRepositorioAD<Role> TRole { get; }
        IRepositorioAD<Tanque> TTanque { get; }
        IRepositorioAD<Usuario> TUsuario { get; }

        int Completar();
        void CompletarTran();
        void EmpezarTransaccion();
        void Rollback();
        void CerrarConexion();


    }
}
