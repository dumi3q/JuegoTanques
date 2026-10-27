namespace JuegoTanques.API.Servicios;

// Resultado simple: o salió bien (Datos) o salió mal (Error y, a veces, Sugerencias)
public class ResultadoAuth<T>
{
    public bool Exito { get; private init; }
    public T? Datos { get; private init; }
    public string? Error { get; private init; }
    public List<string>? Sugerencias { get; private init; }

    public static ResultadoAuth<T> Ok(T datos) => new() { Exito = true, Datos = datos };

    public static ResultadoAuth<T> Fallo(string error, List<string>? sugerencias = null) =>
        new() { Exito = false, Error = error, Sugerencias = sugerencias };
}