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
  dias_habilitados: string[];
}): Promise<{ tournament_id: string; total_partidos: number; pendientes: number }> {
  const { data } = await api.post('/api/cronograma/confirmar', payload);
  return data;
}
