import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  private hubConnection?: signalR.HubConnection;

  private salaActualSubject = new BehaviorSubject<any>(null);
  public salaActual$ = this.salaActualSubject.asObservable();

  private listaSalasSubject = new BehaviorSubject<any[]>([]);
  public listaSalas$ = this.listaSalasSubject.asObservable();

  private partidaIniciadaSubject = new BehaviorSubject<any>(null);
  public partidaIniciada$ = this.partidaIniciadaSubject.asObservable();

  constructor() { }

  private extraerTokenLimpio(): string {
    // Buscamos todas las llaves posibles donde se guarde el auth
    const posiblesKeys = ['token', 'access_token', 'auth_token', 'jwt', 'usuario', 'user', 'sesion'];
    let rawToken = '';

    for (const key of posiblesKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        rawToken = val;
        break;
      }
    }

    // Si no lo encontramos por llave directa, buscamos en todo el localStorage
    if (!rawToken) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val && (val.startsWith('ey') || val.includes('token'))) {
            rawToken = val;
            break;
          }
        }
      }
    }

    if (!rawToken) return '';

    // 🟢 LA CLAVE DE ORO: Si el localStorage guardó un objeto JSON en lugar de un string plano, lo desestructuramos
    try {
      if (rawToken.startsWith('{') && rawToken.endsWith('}')) {
        const parsed = JSON.parse(rawToken);
        // Buscamos la propiedad común donde venga el JWT
        return parsed.token || parsed.access_token || parsed.jwt || parsed.accessToken || '';
      }
    } catch (e) {
      // Si no es JSON válido, asumimos que es el string plano
    }

    return rawToken.trim();
  }

  public async iniciarConexion(tokenExterno?: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = tokenExterno || this.extraerTokenLimpio();

    console.log('🔍 [SignalR] Token extraído y limpio:', token ? 'SÍ EXISTE 🟢 (Longitud: ' + token.length + ')' : 'NO EXISTE 🔴');

    const baseUrl = environment.baseUrl.replace('/api', '');
    const hubUrl = `${baseUrl}/salasHub`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        // Pasamos el token puro y limpio exclusivamente mediante la factoría estándar
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .build();

    this.configurarListeners();

    try {
      await this.hubConnection.start();
      console.log('¡Conectado al Hub de Salas exitosamente, mae!');
      await this.listarSalas();
    } catch (err) {
      console.error('Error al conectar con SignalR (Reintentando en 3s):', err);
      setTimeout(() => this.iniciarConexion(tokenExterno), 3000);
    }
  }

  private async asegurarConexion(): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      await this.iniciarConexion();
      let intentos = 0;
      while (this.hubConnection?.state !== signalR.HubConnectionState.Connected && intentos < 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        intentos++;
      }
    }
  }

  private configurarListeners() {
    if (!this.hubConnection) return;

    this.hubConnection.off('SalaActualizada');
    this.hubConnection.off('ListaSalasActualizada');
    this.hubConnection.off('SalasCambiaron');
    this.hubConnection.off('PartidaIniciada');
    this.hubConnection.off('JugadorSalio');

    this.hubConnection.on('SalaActualizada', (detalleSala) => {
      this.salaActualSubject.next(detalleSala);
    });

    this.hubConnection.on('ListaSalasActualizada', (listaSalas) => {
      this.listaSalasSubject.next(listaSalas);
    });

    this.hubConnection.on('SalasCambiaron', async () => {
      await this.listarSalas();
    });

    this.hubConnection.on('PartidaIniciada', (detalle) => {
      this.partidaIniciadaSubject.next(detalle);
    });
  }

  public async listarSalas(): Promise<any[]> {
    await this.asegurarConexion();
    try {
      const lista = await this.hubConnection!.invoke('ListarSalas');
      if (lista) {
        this.listaSalasSubject.next(lista);
      }
      return lista || [];
    } catch (e) {
      console.error('Error al invocar ListarSalas:', e);
      return [];
    }
  }

  public async crearSala(datos: any): Promise<any> {
    await this.asegurarConexion();

    try {
      const respuesta: any = await this.hubConnection!.invoke('CrearSala', datos);
      const sala = respuesta?.sala ?? respuesta?.Sala ?? null;
      const error = respuesta?.error ?? respuesta?.Error ?? null;

      if (error || !sala) {
        return { error: error ?? 'El servidor no confirmó la creación de la sala.' };
      }

      this.salaActualSubject.next(sala);
      return { sala };
    } catch (e) {
      console.error('Error al invocar CrearSala:', e);
      return { error: 'No se pudo crear la sala por un error de comunicación.' };
    }
  }

  public async unirseSala(codigo: string, presetId?: number | null): Promise<any> {
    await this.asegurarConexion();

    try {
      const respuesta: any = await this.hubConnection!.invoke(
        'UnirseSala',
        (codigo ?? '').trim().toUpperCase(),
        presetId ?? null
      );

      const sala = respuesta?.sala ?? respuesta?.Sala ?? null;
      const error = respuesta?.error ?? respuesta?.Error ?? null;

      if (error || !sala) {
        return { error: error ?? 'El servidor no confirmó la unión a la sala.' };
      }

      this.salaActualSubject.next(sala);
      return { sala };
    } catch (e) {
      console.error('Error al invocar UnirseSala:', e);
      return { error: 'No se pudo conectar con el servidor de salas.' };
    }
  }

  public async salirSala(): Promise<void> {
    await this.asegurarConexion();
    await this.hubConnection!.invoke('SalirSala');
    this.salaActualSubject.next(null);
  }

  public async cambiarColor(color: string): Promise<string | null> {
    await this.asegurarConexion();
    const resultado = await this.hubConnection!.invoke('CambiarColor', color);
    return (resultado !== undefined ? resultado : null) as string | null;
  }

  public async iniciarPartida(): Promise<string | null> {
    await this.asegurarConexion();
    const resultado = await this.hubConnection!.invoke('IniciarPartida');
    return (resultado !== undefined ? resultado : null) as string | null;
  }

  public async marcarListo(): Promise<void> {
    await this.asegurarConexion();
    await this.hubConnection!.invoke('EstoyListo');
  }

  public async desconectar(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
    }
  }
}
