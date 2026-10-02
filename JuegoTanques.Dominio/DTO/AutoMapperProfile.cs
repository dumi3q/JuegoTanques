using AutoMapper;
using JuegoTanques.Dominio.Entidades;
using System;
using System.Collections.Generic;
using System.Text;
using JuegoTanques.Dominio.EntidadesTipadas;
namespace JuegoTanques.Dominio.DTO
{
    internal class AutoMapperProfile :Profile
    {
        public AutoMapperProfile() { 
           
            CreateMap<Arma,TArma>().ReverseMap();
            
            CreateMap<Partida, TPartida>().ReverseMap();
            
            CreateMap<DetallePartidaJugador, TDetallePartidaJugador>().ReverseMap();
            
            CreateMap<EquipamientosPreguardados, TEquipamentosPreguardados>().ReverseMap();
            
            CreateMap<InventarioTanque, TInventarioTanque>().ReverseMap();
            
            CreateMap<Role, TRole>().ReverseMap();
            
            CreateMap<Tanque, TTanque>().ReverseMap();
            
            CreateMap<Usuario, TUsuario>().ReverseMap();
            
            CreateMap<Partida, TPartida>().ReverseMap();

        }
    }
}
