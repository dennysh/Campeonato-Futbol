import { create } from 'zustand';
import type { ScheduleOutput } from '../types/schedule';

export type Genero = 'masculino' | 'femenino';

export interface CategoriaSeleccionada {
  sub: number;
  genero: Genero;
  num_equipos: number;
}

export interface ConfigCanchaItem {
  id: number;
  nombre: string;
  categorias_ids: string[]; // ej: ["sub6_masculino", "sub7_femenino"]
}

export interface ConfigCanchas {
  num_canchas: number;
  canchas: ConfigCanchaItem[];
}

export interface ConfigHorario {
  hora_inicio: string; // default "08:00"
  hora_fin: string;    // default "17:00"
}

export interface CanchaConfigDia {
  cancha_id: number;
  activa: boolean;
  hora_inicio?: string; // undefined = usa global
  hora_fin?: string;    // undefined = usa global
}

export interface DiaHabilitado {
  fecha: string;
  canchas_config?: CanchaConfigDia[]; // undefined = todas activas con horario global
}

interface WizardState {
  paso: number;
  nombre_torneo: string;
  fecha_inicio: string;
  categorias: CategoriaSeleccionada[];
  config_canchas: ConfigCanchas;
  config_horario: ConfigHorario;
  dias_habilitados: DiaHabilitado[];
  preview: ScheduleOutput | null;
  cargando_preview: boolean;
  error_preview: string | null;

  setPaso: (paso: number) => void;
  setNombreTorneo: (nombre: string) => void;
  setFechaInicio: (fecha: string) => void;
  setCategorias: (categorias: CategoriaSeleccionada[]) => void;
  setConfigCanchas: (config: ConfigCanchas) => void;
  setConfigHorario: (config: ConfigHorario) => void;
  setDiasHabilitados: (dias: DiaHabilitado[]) => void;
  setPreview: (preview: ScheduleOutput | null) => void;
  setCargandoPreview: (v: boolean) => void;
  setErrorPreview: (e: string | null) => void;
  resetWizard: () => void;
}

const configCanchasDefault: ConfigCanchas = {
  num_canchas: 1,
  canchas: [{ id: 1, nombre: 'Cancha 1', categorias_ids: [] }],
};

const configHorarioDefault: ConfigHorario = {
  hora_inicio: '08:00',
  hora_fin: '17:00',
};

export const useWizardStore = create<WizardState>((set) => ({
  paso: 1,
  nombre_torneo: '',
  fecha_inicio: '',
  categorias: [],
  config_canchas: configCanchasDefault,
  config_horario: configHorarioDefault,
  dias_habilitados: [],
  preview: null,
  cargando_preview: false,
  error_preview: null,

  setPaso: (paso) => set({ paso }),
  setNombreTorneo: (nombre) => set({ nombre_torneo: nombre }),
  setFechaInicio: (fecha) => set({ fecha_inicio: fecha }),
  setCategorias: (categorias) => set({ categorias }),
  setConfigCanchas: (config) => set({ config_canchas: config }),
  setConfigHorario: (config) => set({ config_horario: config }),
  setDiasHabilitados: (dias) => set({ dias_habilitados: dias }),
  setPreview: (preview) => set({ preview }),
  setCargandoPreview: (cargando_preview) => set({ cargando_preview }),
  setErrorPreview: (error_preview) => set({ error_preview }),
  resetWizard: () =>
    set({
      paso: 1,
      nombre_torneo: '',
      fecha_inicio: '',
      categorias: [],
      config_canchas: configCanchasDefault,
      config_horario: configHorarioDefault,
      dias_habilitados: [],
      preview: null,
      cargando_preview: false,
      error_preview: null,
    }),
}));
