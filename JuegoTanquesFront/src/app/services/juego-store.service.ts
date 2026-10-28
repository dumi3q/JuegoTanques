import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { IRespuesta } from '../models/IRespuesta';
import {
  ICatalogo, ICompraRespuesta, IInventario, IPreset, IRankingItem, IResumenJugador,
} from '../models/IJuego';
import { aArmaJuego, aTanqueJuego, codigoArma, codigoTanque } from '../models/CatalogoUtil';

// Guarda en un solo lugar los datos reales del jugador. Inicio, Perfil, Tienda y Ranking
// leen de aquí, así cuando compras algo todas las pantallas se actualizan solas.
// Usa "signals": Angular redibuja la pantalla cuando cambian, sin depender de zone.js.
@Injectable({ providedIn: 'root' })
export class JuegoStore {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  // ---------- Datos ----------
  readonly resumen = signal<IResumenJugador | null>(null);
  readonly catalogo = signal<ICatalogo>({ tanques: [], armas: [] });
  readonly inventario = signal<IInventario>({ tanqueIds: [], armaIds: [] });
  readonly presets = signal<IPreset[]>([]);
  readonly ranking = signal<IRankingItem[]>([]);

  // ---------- Estado ----------
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly conectado = signal<boolean | null>(null); // null = todavía no se sabe
  readonly rankingCargando = signal(false);
  readonly rankingError = signal('');

  // ---------- Derivados (se calculan solos) ----------
  readonly tanques = computed(() => this.catalogo().tanques.map(aTanqueJuego));
  readonly armas = computed(() => this.catalogo().armas.map(aArmaJuego));

  // El preset activo es el equipo con el que juegas
  readonly presetActivo = computed(() => this.presets().find(p => p.esActivo) ?? this.presets()[0] ?? null);

  readonly tanqueEquipado = computed(() => {
    const preset = this.presetActivo();
    return preset ? this.tanques().find(t => t.tanque_id === codigoTanque(preset.tanqueId)) ?? null : null;
  });

  readonly armaEquipada = computed(() => {
    const preset = this.presetActivo();
    return preset ? this.armas().find(a => a.arma_id === codigoArma(preset.armaId)) ?? null : null;
  });

  readonly xpPorcentaje = computed(() => {
    const r = this.resumen();
    if (!r || r.experienciaSiguienteNivel <= 0) return 0;
    return Math.min(100, Math.round((r.experiencia / r.experienciaSiguienteNivel) * 100));
  });

  // =====================================================
  //  Cargar datos
  // =====================================================
  async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [resumen, catalogo, inventario, presets] = await Promise.all([
        this.get<IResumenJugador>('/Jugador/Resumen'),
        this.get<ICatalogo>('/Catalogo'),
        this.get<IInventario>('/Jugador/Inventario'),
        this.get<IPreset[]>('/Jugador/Presets'),
      ]);
      this.resumen.set(resumen);
      this.catalogo.set(catalogo);
      this.inventario.set(inventario);
      this.presets.set(presets);
      this.conectado.set(true);
    } catch (e) {
      this.error.set(this.mensajeDe(e));
      this.conectado.set(!(e instanceof HttpErrorResponse && e.status === 0));
    } finally {
      this.cargando.set(false);
    }
  }

  async cargarRanking(): Promise<void> {
    this.rankingCargando.set(true);
    this.rankingError.set('');
    try {
      this.ranking.set(await this.get<IRankingItem[]>('/Ranking'));
    } catch (e) {
      this.rankingError.set(this.mensajeDe(e));
    } finally {
      this.rankingCargando.set(false);
    }
  }

  // =====================================================
  //  Acciones (si algo sale mal lanzan un Error con el mensaje)
  // =====================================================
  async comprar(tipo: 'tanque' | 'arma', id: number): Promise<void> {
    await this.enviar<ICompraRespuesta>('post', '/Tienda/Comprar', { tipo, id });
    // Cambiaron las monedas y el inventario: los volvemos a pedir
    const [resumen, inventario] = await Promise.all([
      this.get<IResumenJugador>('/Jugador/Resumen'),
      this.get<IInventario>('/Jugador/Inventario'),
    ]);
    this.resumen.set(resumen);
    this.inventario.set(inventario);
  }

  async equipar(datos: { tanqueId?: number; armaId?: number }): Promise<void> {
    this.presets.set(await this.enviar<IPreset[]>('put', '/Jugador/Equipar', datos));
  }

  async guardarPreset(datos: { numeroSlot: number; nombre: string; tanqueId: number; armaId: number }): Promise<void> {
    this.presets.set(await this.enviar<IPreset[]>('post', '/Jugador/Presets', datos));
  }

  async activarPreset(presetId: number): Promise<void> {
    this.presets.set(await this.enviar<IPreset[]>('put', `/Jugador/Presets/${presetId}/Activar`, {}));
  }

  // Al cerrar sesión se borra todo para que otro usuario no vea datos ajenos
  limpiar(): void {
    this.resumen.set(null);
    this.catalogo.set({ tanques: [], armas: [] });
    this.inventario.set({ tanqueIds: [], armaIds: [] });
    this.presets.set([]);
    this.ranking.set([]);
    this.error.set('');
    this.conectado.set(null);
  }

  // Convierte cualquier error en un texto que se pueda mostrar en pantalla
  mensajeDe(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0) return 'No se pudo conectar con el servidor.';
      return e.error?.error || `Error del servidor (${e.status}).`;
    }
    return e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
  }

  // =====================================================
  //  Ayudas internas
  // =====================================================
  private async get<T>(ruta: string): Promise<T> {
    return this.extraer(await firstValueFrom(this.http.get<IRespuesta<T>>(this.base + ruta)));
  }

  private async enviar<T>(metodo: 'post' | 'put', ruta: string, cuerpo: unknown): Promise<T> {
    const url = this.base + ruta;
    const peticion = metodo === 'post'
      ? this.http.post<IRespuesta<T>>(url, cuerpo)
      : this.http.put<IRespuesta<T>>(url, cuerpo);
    return this.extraer(await firstValueFrom(peticion));
  }

  private extraer<T>(respuesta: IRespuesta<T>): T {
    if (respuesta.error || respuesta.data === null || respuesta.data === undefined) {
      throw new Error(respuesta.error || 'El servidor no devolvió datos.');
    }
    return respuesta.data;
  }

  async actualizarFotoPerfil(fotoBase64: string): Promise<void> {
    await this.enviar<boolean>('put', '/Usuario/ActualizarFoto', { fotoBase64 });

    const resumenActual = this.resumen();
    if (resumenActual) {
      // 🟢 Corrige 'foto_perfil' por 'fotoPerfil' para que coincida exactamente con la interfaz y el HTML
      this.resumen.set({ ...resumenActual, foto_perfil: fotoBase64 });
    }
  }
}
