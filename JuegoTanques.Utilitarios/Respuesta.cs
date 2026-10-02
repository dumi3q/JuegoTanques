using System;
using System.Collections.Generic;
using System.Text;
namespace JuegoTanques.Utilitarios
{
    public partial class Respuesta<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string Error { get; set; }

        public Respuesta()
        {
            Success = true;
            Error = "";
        }

        protected Respuesta(bool success, T? data, string error)
        {
            Success = success;
            Data = data;
            Error = error;
        }

        public static Respuesta<T> Ok(T data) => new(true, data, null);

        public static Respuesta<T> Fail(String error) => new(false, default, error);
    }
}
