import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Subject } from 'rxjs';

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

  private estadoRemotoSubject = new Subject<any>();
  public estadoRemoto$ = this.estadoRemotoSubject.asObservable();
  private disparoRemotoSubject = new Subject<any>();
  public disparoRemoto$ = this.disparoRemotoSubject.asObservable();
  private zonaRemotaSubject = new Subject<any>();
  public zonaRemota$ = this.zonaRemotaSubject.asObservable();
  private rondaIniciadaSubject = new BehaviorSubject<any>(null);
  public rondaIniciada$ = this.rondaIniciadaSubject.asObservable();
  private rondaTerminadaSubject = new Subject<any>();
  public rondaTerminada$ = this.rondaTerminadaSubject.asObservable();
  private partidaTerminadaSubject = new BehaviorSubject<any>(null);
  public partidaTerminada$ = this.partidaTerminadaSubject.asObservable();
  private jugadorImpactadoSubject = new Subject<any>();
  public jugadorImpactado$ = this.jugadorImpactadoSubject.asObservable();
  private jugadorMurioSubject = new Subject<any>();
  public jugadorMurio$ = this.jugadorMurioSubject.asObservable();
  private jugadorReaparecioSubject = new Subject<any>();
  public jugadorReaparecio$ = this.jugadorReaparecioSubject.asObservable();
  private powerUpAparecioSubject = new Subject<any>();
  public powerUpAparecio$ = this.powerUpAparecioSubject.asObservable();
  private powerUpRecogidoSubject = new Subject<any>();
  public powerUpRecogido$ = this.powerUpRecogidoSubject.asObservable();
  private disparoConsumidoSubject = new Subject<any>();
  public disparoConsumido$ = this.disparoConsumidoSubject.asObservable();
  private jugadorSalioSubject = new Subject<any>();
  public jugadorSalio$ = this.jugadorSalioSubject.asObservable();

  public getSalaActual(): any {
    return this.salaActualSubject.value;
  }

  /** ID autoritativo que el backend asocia con la conexión actual de SignalR. */
  public async obtenerMiUsuarioId(): Promise<number> {
    await this.asegurarConexion();
    const id = Number(await this.hubConnection!.invoke('ObtenerMiUsuarioId'));
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('El servidor no pudo asociar esta conexión con un usuario de la sala.');
    }
    return id;
  }

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

    const hubUrl =
      environment.baseUrl.replace(/\/api\/?$/, '') + '/salasHub';

    console.log('🌐 [SignalR] Conectando al Hub:', hubUrl);


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
    this.hubConnection.off('EstadoRemoto');
    this.hubConnection.off('DisparoRemoto');
    this.hubConnection.off('ZonaRemota');
    this.hubConnection.off('RondaIniciada');
    this.hubConnection.off('RondaTerminada');
    this.hubConnection.off('PartidaTerminada');
    this.hubConnection.off('JugadorImpactado');
    this.hubConnection.off('JugadorMurio');
    this.hubConnection.off('JugadorReaparecio');
    this.hubConnection.off('PowerUpAparecio');
    this.hubConnection.off('PowerUpRecogido');
    this.hubConnection.off('DisparoConsumido');
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
      if (detalle && (detalle.jugadores || detalle.Jugadores)) {
        this.salaActualSubject.next(detalle);
      }
      this.partidaIniciadaSubject.next(detalle);
    });

    this.hubConnection.on('EstadoRemoto', (estado) => this.estadoRemotoSubject.next(estado));
    this.hubConnection.on('DisparoRemoto', (disparo) => this.disparoRemotoSubject.next(disparo));
    this.hubConnection.on('ZonaRemota', (zona) => this.zonaRemotaSubject.next(zona));
    this.hubConnection.on('RondaIniciada', (ronda) => this.rondaIniciadaSubject.next(ronda));
    this.hubConnection.on('RondaTerminada', (ronda) => this.rondaTerminadaSubject.next(ronda));
    this.hubConnection.on('PartidaTerminada', (resultado) => this.partidaTerminadaSubject.next(resultado));
    this.hubConnection.on('JugadorImpactado', (dato) => this.jugadorImpactadoSubject.next(dato));
    this.hubConnection.on('JugadorMurio', (dato) => this.jugadorMurioSubject.next(dato));
    this.hubConnection.on('JugadorReaparecio', (dato) => this.jugadorReaparecioSubject.next(dato));
    this.hubConnection.on('PowerUpAparecio', (dato) => this.powerUpAparecioSubject.next(dato));
    this.hubConnection.on('PowerUpRecogido', (dato) => this.powerUpRecogidoSubject.next(dato));
    this.hubConnection.on('DisparoConsumido', (dato) => this.disparoConsumidoSubject.next(dato));
    this.hubConnection.on('JugadorSalio', (dato) => this.jugadorSalioSubject.next(dato));
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
    const resultado: any = await this.hubConnection!.invoke('CrearSala', datos);
    const sala = resultado?.sala ?? resultado?.Sala ??
      ((resultado?.jugadores || resultado?.Jugadores) ? resultado : null);
    if (sala && !(resultado?.error || resultado?.Error)) {
      this.partidaIniciadaSubject.next(null);
      this.partidaTerminadaSubject.next(null);
      this.rondaIniciadaSubject.next(null);
      this.salaActualSubject.next(sala);
    }
    return resultado;
  }

  public async unirseSala(codigo: string, presetId?: number | null): Promise<any> {
    await this.asegurarConexion();
    try {
      const resultado: any = await this.hubConnection!.invoke('UnirseSala', codigo, presetId ?? null);
      const sala = resultado?.sala ?? resultado?.Sala ??
        ((resultado?.jugadores || resultado?.Jugadores) ? resultado : null);
      if (sala && !(resultado?.error || resultado?.Error)) {
        this.partidaIniciadaSubject.next(null);
        this.partidaTerminadaSubject.next(null);
        this.rondaIniciadaSubject.next(null);
        this.salaActualSubject.next(sala);
      }
      return resultado;
    } catch (e) {
      console.error('Error al invocar UnirseSala:', e);
      return { error: 'No se pudo conectar con el servidor de salas.' };
    }
  }

  public async enviarEstado(estado: any): Promise<void> {
    await this.asegurarConexion();
    await this.hubConnection!.invoke('EnviarEstado', estado);
  }

  public async enviarDisparo(disparo: any): Promise<void> {
    await this.asegurarConexion();
    await this.hubConnection!.invoke('EnviarDisparo', disparo);
  }

  public async lanzarZona(zona: any): Promise<void> {
    await this.asegurarConexion();
    await this.hubConnection!.invoke('LanzarZona', zona);
  }

  public async aplicarVeneno(atacanteUsuarioId: number): Promise<any> {
    await this.asegurarConexion();
    return await this.hubConnection!.invoke('AplicarVeneno', atacanteUsuarioId);
  }

  public async registrarImpacto(balaId: string): Promise<any> {
    await this.asegurarConexion();
    return await this.hubConnection!.invoke('RegistrarImpacto', balaId);
  }

  public async listarPowerUps(): Promise<any[]> {
    await this.asegurarConexion();
    return await this.hubConnection!.invoke('ListarPowerUps') ?? [];
  }

  public async crearPowerUp(item: any): Promise<boolean> {
    await this.asegurarConexion();
    return await this.hubConnection!.invoke('CrearPowerUp', item);
  }

  public async recogerPowerUp(id: string): Promise<boolean> {
    await this.asegurarConexion();
    return await this.hubConnection!.invoke('RecogerPowerUp', id);
  }

  public async salirSala(): Promise<void> {
    await this.asegurarConexion();
    await this.hubConnection!.invoke('SalirSala');
    this.salaActualSubject.next(null);
    this.partidaIniciadaSubject.next(null);
    this.partidaTerminadaSubject.next(null);
    this.rondaIniciadaSubject.next(null);
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
