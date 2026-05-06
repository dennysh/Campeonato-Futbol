export type Modalidad = '11v11' | '9v9' | '7v7' | '5v5' | 'Futsal' | string;

export interface EquipoInput {
  id: string;
  nombre: string;
  categoria_id: string;
  coach_id: string;
}

export interface CategoriaInput {
  id: string;
  nombre: string;
  modalidad: Modalidad;
}

export interface DisponibilidadCancha {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface CanchaInput {
  id: string;
  nombre: string;
  categorias_permitidas: string[];
  disponibilidad: DisponibilidadCancha[];
}

export interface CoachInput {
  id: string;
  nombre: string;
}

export interface ReglasInput {
  duracion_partido_minutos: number;
  descanso_minimo_minutos: number;
  max_partidos_por_dia: number;
}

export interface ScheduleInput {
  equipos: EquipoInput[];
  categorias: CategoriaInput[];
  canchas: CanchaInput[];
  coaches: CoachInput[];
  dias_habilitados: string[];
  reglas: ReglasInput;
}

export interface PartidoAsignado {
  id_temp: string;
  equipo_local_id: string;
  equipo_visitante_id: string;
  cancha_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  categoria_id: string;
}

export interface PartidoPendiente {
  equipo_local_id: string;
  equipo_visitante_id: string;
  categoria_id: string;
  motivo: string;
}

export interface Conflicto {
  tipo: string;
  descripcion: string;
}

export interface ResumenCronograma {
  total_partidos: number;
  total_asignados: number;
  total_pendientes: number;
  fecha_inicio: string;
  fecha_fin_calculada: string;
  dias_utilizados: number;
}

export interface ScheduleOutput {
  partidos_asignados: PartidoAsignado[];
  partidos_pendientes: PartidoPendiente[];
  conflictos: Conflicto[];
  resumen: ResumenCronograma;
}
