using JuegoTanques.Dominio.EntidadesTipadas;
using JuegoTanques.Utilitarios;
using System;
using System.Collections.Generic;
using System.Text;

namespace JuegoTanques.Dominio.InterfacesLN
{
    public interface IEquipamentosPreguardadosLN
    {
        Respuesta<TEquipamentosPreguardados> Insertar(TEquipamentosPreguardados clase);
        Respuesta<TEquipamentosPreguardados> Modificar(TEquipamentosPreguardados clase);
        Respuesta<bool> Eliminar(TEquipamentosPreguardados pedido);
        Respuesta<IEnumerable<TEquipamentosPreguardados>> Obtener(TEquipamentosPreguardados clase);
        Respuesta<TEquipamentosPreguardados> Buscar(TEquipamentosPreguardados clase);
        Respuesta<IEnumerable<TEquipamentosPreguardados>> Listar();
    }
}
