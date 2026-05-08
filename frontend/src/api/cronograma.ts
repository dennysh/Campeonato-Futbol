import axios from 'axios';
import type { ScheduleInput, ScheduleOutput } from '../types/schedule';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth');
  if (raw) {
    const { state } = JSON.parse(raw);
    if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
  }
  return config;
});

export async function login(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password });
  return data as { token: string; user: { id: string; nombre: string; email: string; role: string } };
}

export async function register(nombre: string, email: string, password: string) {
  const { data } = await api.post('/api/auth/register', { nombre, email, password });
  return data as { token: string; user: { id: string; nombre: string; email: string; role: string } };
}

export async function generarPreview(input: ScheduleInput): Promise<ScheduleOutput> {
  const { data } = await api.post<ScheduleOutput>('/api/cronograma/preview', input);
  return data;
}

export async function getTorneos() {
  const { data } = await api.get('/api/torneos');
  return data;
}

export async function getTorneo(id: string) {
  const { data } = await api.get(`/api/torneos/${id}`);
  return data;
}

export async function moverPartido(torneoId: string, matchId: string, cambio: {
  fecha: string; hora_inicio: string; hora_fin: string; field_id?: string;
}, forzar = false) {
  const url = `/api/torneos/${torneoId}/partidos/${matchId}${forzar ? '?forzar=true' : ''}`;
  const { data } = await api.patch(url, cambio);
  return data;
}

export async function publicarTorneo(id: string) {
  const { data } = await api.patch(`/api/torneos/${id}/publicar`, {});
  return data;
}

export async function confirmarTorneo(payload: {
  nombre: string;
  fecha_inicio: string;
  categorias: unknown[];
  config_canchas: unknown;
  config_horario: unknown;
  dias_habilitados: unknown[];
}): Promise<{ tournament_id: string; total_partidos: number; pendientes: number }> {
  const { data } = await api.post('/api/cronograma/confirmar', payload);
  return data;
}

// ── Equipos ──────────────────────────────────────────────────────
export async function getEquipos(torneoId: string) {
  const { data } = await api.get(`/api/torneos/${torneoId}/equipos`);
  return data;
}

export async function updateEquipo(torneoId: string, teamId: string, body: { nombre?: string; club_id?: string | null }) {
  const { data } = await api.patch(`/api/torneos/${torneoId}/equipos/${teamId}`, body);
  return data;
}

export async function getJugadores(torneoId: string, teamId: string) {
  const { data } = await api.get(`/api/torneos/${torneoId}/equipos/${teamId}/jugadores`);
  return data;
}

export async function crearJugador(torneoId: string, teamId: string, body: { nombre: string; numero?: number | null; posicion?: string }) {
  const { data } = await api.post(`/api/torneos/${torneoId}/equipos/${teamId}/jugadores`, body);
  return data;
}

export async function updateJugador(torneoId: string, teamId: string, playerId: string, body: { nombre?: string; numero?: number | null; posicion?: string }) {
  const { data } = await api.patch(`/api/torneos/${torneoId}/equipos/${teamId}/jugadores/${playerId}`, body);
  return data;
}

export async function eliminarJugador(torneoId: string, teamId: string, playerId: string) {
  await api.delete(`/api/torneos/${torneoId}/equipos/${teamId}/jugadores/${playerId}`);
}

// ── Stats de partido ─────────────────────────────────────────────
export async function getMatchStats(torneoId: string, matchId: string) {
  const { data } = await api.get(`/api/torneos/${torneoId}/partidos/${matchId}/stats`);
  return data;
}

export async function saveMatchStats(torneoId: string, matchId: string, body: {
  home_score: number | null;
  away_score: number | null;
  stats: { player_id: string; goles: number; asistencias: number; amarillas: number; rojas: number; faltas: number }[];
}) {
  const { data } = await api.put(`/api/torneos/${torneoId}/partidos/${matchId}/stats`, body);
  return data;
}

// ── Clubes ───────────────────────────────────────────────────────
export async function getClubes() {
  const { data } = await api.get('/api/clubes');
  return data;
}

export async function crearClub(body: { nombre: string; ciudad?: string }) {
  const { data } = await api.post('/api/clubes', body);
  return data;
}
