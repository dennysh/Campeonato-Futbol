import { v4 as uuidv4 } from 'uuid';
import {
  ScheduleInput,
  ScheduleOutput,
  PartidoAsignado,
  PartidoPendiente,
  Conflicto,
} from '../types/schedule';

interface ParDePartido {
  equipo_local_id: string;
  equipo_visitante_id: string;
  categoria_id: string;
}

interface EstadoEquipo {
  ultimo_partido_fin_minutos: number | null;
  ultimo_partido_fecha: string | null;
  partidos_hoy: number;
  fecha_actual_contador: string | null;
}

interface EstadoCoach {
  ocupado_bloques: Set<string>;
}

// Convierte "HH:mm" a minutos desde medianoche
function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// Convierte minutos desde medianoche a "HH:mm"
function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Clave unica para un bloque: identifica cancha + fecha + hora_inicio
function claveBloqueCancha(cancha_id: string, fecha: string, hora_inicio_min: number): string {
  return `${cancha_id}|${fecha}|${hora_inicio_min}`;
}

// Clave unica para ocupacion de un equipo en un bloque
function claveOcupacionEquipo(equipo_id: string, fecha: string, hora_inicio_min: number): string {
  return `${equipo_id}|${fecha}|${hora_inicio_min}`;
}

// Genera todos los pares Round Robin para una categoria (algoritmo de rotacion circular)
function generarParesRoundRobin(equipos_ids: string[]): Array<[string, string]> {
  const pares: Array<[string, string]> = [];
  const n = equipos_ids.length;
  if (n < 2) return pares;

  const lista = [...equipos_ids];
  // Si n es impar, agregar un BYE ficticio que luego se omite
  const tiene_bye = n % 2 !== 0;
  if (tiene_bye) lista.push('__bye__');

  const total_rondas = lista.length - 1;
  const mitad = lista.length / 2;

  for (let ronda = 0; ronda < total_rondas; ronda++) {
    for (let i = 0; i < mitad; i++) {
      const local = lista[i];
      const visitante = lista[lista.length - 1 - i];
      if (local !== '__bye__' && visitante !== '__bye__') {
        pares.push([local, visitante]);
      }
    }
    // Rotar: el primer elemento queda fijo, el resto rota
    const ultimo = lista.pop()!;
    lista.splice(1, 0, ultimo);
  }

  return pares;
}

export function generarCronograma(input: ScheduleInput): ScheduleOutput {
  const {
    equipos,
    categorias,
    canchas,
    coaches,
    dias_habilitados,
    reglas,
  } = input;

  const duracion = reglas.duracion_partido_minutos;
  const descanso_min = reglas.descanso_minimo_minutos;
  const max_por_dia = reglas.max_partidos_por_dia;

  const dias_ordenados = [...dias_habilitados].sort();

  // Estado mutable durante la asignacion (local a esta funcion, sin efectos externos)
  const canchas_ocupadas = new Set<string>();
  const equipos_ocupados_bloque = new Set<string>();
  const coaches_ocupados = new Map<string, Set<string>>();
  const estado_equipos = new Map<string, EstadoEquipo>();
  const estado_coaches = new Map<string, EstadoCoach>();

  const partidos_asignados: PartidoAsignado[] = [];
  const partidos_pendientes: PartidoPendiente[] = [];
  const conflictos: Conflicto[] = [];

  // Inicializar estado por equipo
  for (const equipo of equipos) {
    estado_equipos.set(equipo.id, {
      ultimo_partido_fin_minutos: null,
      ultimo_partido_fecha: null,
      partidos_hoy: 0,
      fecha_actual_contador: null,
    });
  }

  // Inicializar estado por coach
  for (const coach of coaches) {
    estado_coaches.set(coach.id, { ocupado_bloques: new Set() });
  }

  // Generar pares por categoria
  const pares_por_categoria = new Map<string, ParDePartido[]>();

  for (const categoria of categorias) {
    const equipos_categoria = equipos
      .filter((e) => e.categoria_id === categoria.id)
      .map((e) => e.id);

    if (equipos_categoria.length < 2) continue;

    const pares_raw = generarParesRoundRobin(equipos_categoria);
    const pares: ParDePartido[] = pares_raw.map(([local, visitante]) => ({
      equipo_local_id: local,
      equipo_visitante_id: visitante,
      categoria_id: categoria.id,
    }));
    pares_por_categoria.set(categoria.id, pares);
  }

  // Aplanar todos los pares en una lista unica para asignar
  const todos_los_pares: ParDePartido[] = [];
  for (const pares of pares_por_categoria.values()) {
    todos_los_pares.push(...pares);
  }

  // Intentar asignar cada par
  for (const par of todos_los_pares) {
    let asignado = false;

    const equipo_local = equipos.find((e) => e.id === par.equipo_local_id)!;
    const equipo_visitante = equipos.find((e) => e.id === par.equipo_visitante_id)!;
    const coach_local_id = equipo_local.coach_id;
    const coach_visitante_id = equipo_visitante.coach_id;

    const estado_local = estado_equipos.get(par.equipo_local_id)!;
    const estado_visitante = estado_equipos.get(par.equipo_visitante_id)!;

    const canchas_validas = canchas.filter((c) =>
      c.categorias_permitidas.includes(par.categoria_id)
    );

    if (canchas_validas.length === 0) {
      partidos_pendientes.push({
        ...par,
        motivo: `No hay canchas habilitadas para la categoria ${par.categoria_id}`,
      });
      if (!conflictos.find((c) => c.tipo === 'sin_canchas_para_categoria')) {
        conflictos.push({
          tipo: 'sin_canchas_para_categoria',
          descripcion: `La categoria ${par.categoria_id} no tiene canchas asignadas`,
        });
      }
      continue;
    }

    // Iterar dias habilitados
    for (const fecha of dias_ordenados) {
      if (asignado) break;

      // Actualizar contador de partidos del dia para ambos equipos
      if (estado_local.fecha_actual_contador !== fecha) {
        estado_local.partidos_hoy = partidos_asignados.filter(
          (p) => p.fecha === fecha && (p.equipo_local_id === par.equipo_local_id || p.equipo_visitante_id === par.equipo_local_id)
        ).length;
        estado_local.fecha_actual_contador = fecha;
      }
      if (estado_visitante.fecha_actual_contador !== fecha) {
        estado_visitante.partidos_hoy = partidos_asignados.filter(
          (p) => p.fecha === fecha && (p.equipo_local_id === par.equipo_visitante_id || p.equipo_visitante_id === par.equipo_visitante_id)
        ).length;
        estado_visitante.fecha_actual_contador = fecha;
      }

      if (estado_local.partidos_hoy >= max_por_dia) continue;
      if (estado_visitante.partidos_hoy >= max_por_dia) continue;

      // Iterar canchas validas
      for (const cancha of canchas_validas) {
        if (asignado) break;

        const disponibilidad_dia = cancha.disponibilidad.filter((d) => d.fecha === fecha);

        for (const franja of disponibilidad_dia) {
          if (asignado) break;

          const franja_inicio = horaAMinutos(franja.hora_inicio);
          const franja_fin = horaAMinutos(franja.hora_fin);

          // Generar bloques posibles dentro de la franja
          let bloque_inicio = franja_inicio;
          while (bloque_inicio + duracion <= franja_fin) {
            const bloque_fin = bloque_inicio + duracion;
            const clave_cancha = claveBloqueCancha(cancha.id, fecha, bloque_inicio);
            const clave_local = claveOcupacionEquipo(par.equipo_local_id, fecha, bloque_inicio);
            const clave_visitante = claveOcupacionEquipo(par.equipo_visitante_id, fecha, bloque_inicio);

            const coach_local_estado = estado_coaches.get(coach_local_id);
            const coach_visitante_estado = estado_coaches.get(coach_visitante_id);
            const clave_coach_local = `${coach_local_id}|${fecha}|${bloque_inicio}`;
            const clave_coach_visitante = `${coach_visitante_id}|${fecha}|${bloque_inicio}`;

            // Verificar cancha libre
            if (canchas_ocupadas.has(clave_cancha)) {
              bloque_inicio += duracion;
              continue;
            }
            // Verificar equipo local libre en ese bloque
            if (equipos_ocupados_bloque.has(clave_local)) {
              bloque_inicio += duracion;
              continue;
            }
            // Verificar equipo visitante libre en ese bloque
            if (equipos_ocupados_bloque.has(clave_visitante)) {
              bloque_inicio += duracion;
              continue;
            }
            // Verificar coach local libre
            if (coach_local_estado?.ocupado_bloques.has(clave_coach_local)) {
              bloque_inicio += duracion;
              continue;
            }
            // Verificar coach visitante libre
            if (coach_visitante_estado?.ocupado_bloques.has(clave_coach_visitante)) {
              bloque_inicio += duracion;
              continue;
            }

            // Verificar descanso minimo equipo local
            if (estado_local.ultimo_partido_fin_minutos !== null && estado_local.ultimo_partido_fecha !== null) {
              const mismo_dia = estado_local.ultimo_partido_fecha === fecha;
              if (mismo_dia) {
                const diferencia = bloque_inicio - estado_local.ultimo_partido_fin_minutos;
                if (diferencia < descanso_min) {
                  bloque_inicio += duracion;
                  continue;
                }
              }
              // Si es otro dia, el descanso entre dias siempre es >= 120 min
            }

            // Verificar descanso minimo equipo visitante
            if (estado_visitante.ultimo_partido_fin_minutos !== null && estado_visitante.ultimo_partido_fecha !== null) {
              const mismo_dia = estado_visitante.ultimo_partido_fecha === fecha;
              if (mismo_dia) {
                const diferencia = bloque_inicio - estado_visitante.ultimo_partido_fin_minutos;
                if (diferencia < descanso_min) {
                  bloque_inicio += duracion;
                  continue;
                }
              }
            }

            // Todas las restricciones pasan: asignar partido
            const partido: PartidoAsignado = {
              id_temp: uuidv4(),
              equipo_local_id: par.equipo_local_id,
              equipo_visitante_id: par.equipo_visitante_id,
              cancha_id: cancha.id,
              fecha,
              hora_inicio: minutosAHora(bloque_inicio),
              hora_fin: minutosAHora(bloque_fin),
              categoria_id: par.categoria_id,
            };

            partidos_asignados.push(partido);

            // Actualizar estado
            canchas_ocupadas.add(clave_cancha);
            equipos_ocupados_bloque.add(clave_local);
            equipos_ocupados_bloque.add(clave_visitante);
            coach_local_estado?.ocupado_bloques.add(clave_coach_local);
            coach_visitante_estado?.ocupado_bloques.add(clave_coach_visitante);

            estado_local.ultimo_partido_fin_minutos = bloque_fin;
            estado_local.ultimo_partido_fecha = fecha;
            estado_local.partidos_hoy += 1;
            estado_local.fecha_actual_contador = fecha;

            estado_visitante.ultimo_partido_fin_minutos = bloque_fin;
            estado_visitante.ultimo_partido_fecha = fecha;
            estado_visitante.partidos_hoy += 1;
            estado_visitante.fecha_actual_contador = fecha;

            asignado = true;
            break;
          }
        }
      }
    }

    if (!asignado) {
      partidos_pendientes.push({
        ...par,
        motivo: 'No se encontro un bloque disponible con todas las restricciones satisfechas',
      });
    }
  }

  // Calcular fecha fin
  const fechas_usadas = partidos_asignados.map((p) => p.fecha).sort();
  const fecha_fin_calculada = fechas_usadas.length > 0 ? fechas_usadas[fechas_usadas.length - 1] : '';
  const dias_unicos = new Set(fechas_usadas);

  if (partidos_pendientes.length > 0 && !conflictos.find((c) => c.tipo === 'dias_insuficientes')) {
    conflictos.push({
      tipo: 'dias_insuficientes',
      descripcion: `Quedaron ${partidos_pendientes.length} partidos sin asignar. Considera habilitar mas dias o agregar canchas.`,
    });
  }

  return {
    partidos_asignados,
    partidos_pendientes,
    conflictos,
    resumen: {
      total_partidos: todos_los_pares.length,
      total_asignados: partidos_asignados.length,
      total_pendientes: partidos_pendientes.length,
      fecha_inicio: dias_ordenados[0] ?? '',
      fecha_fin_calculada,
      dias_utilizados: dias_unicos.size,
    },
  };
}
