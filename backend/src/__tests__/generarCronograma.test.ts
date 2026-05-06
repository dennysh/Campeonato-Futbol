import { generarCronograma } from '../engine/generarCronograma';
import { ScheduleInput } from '../types/schedule';

function inputBase(): ScheduleInput {
  return {
    equipos: [
      { id: 'eq1', nombre: 'Equipo A', categoria_id: 'cat1', coach_id: 'coach1' },
      { id: 'eq2', nombre: 'Equipo B', categoria_id: 'cat1', coach_id: 'coach2' },
      { id: 'eq3', nombre: 'Equipo C', categoria_id: 'cat1', coach_id: 'coach3' },
      { id: 'eq4', nombre: 'Equipo D', categoria_id: 'cat1', coach_id: 'coach4' },
    ],
    categorias: [
      { id: 'cat1', nombre: 'Sub-12', modalidad: '7v7' },
    ],
    canchas: [
      {
        id: 'cancha1',
        nombre: 'Cancha Principal',
        categorias_permitidas: ['cat1'],
        disponibilidad: [
          { fecha: '2026-06-01', hora_inicio: '08:00', hora_fin: '18:00' },
          { fecha: '2026-06-08', hora_inicio: '08:00', hora_fin: '18:00' },
        ],
      },
    ],
    coaches: [
      { id: 'coach1', nombre: 'Profe 1' },
      { id: 'coach2', nombre: 'Profe 2' },
      { id: 'coach3', nombre: 'Profe 3' },
      { id: 'coach4', nombre: 'Profe 4' },
    ],
    dias_habilitados: ['2026-06-01', '2026-06-08'],
    reglas: {
      duracion_partido_minutos: 60,
      descanso_minimo_minutos: 120,
      max_partidos_por_dia: 2,
    },
  };
}

describe('generarCronograma', () => {
  test('genera el numero correcto de partidos para Round Robin de 4 equipos', () => {
    const input = inputBase();
    const output = generarCronograma(input);
    // 4 equipos: C(4,2) = 6 partidos
    expect(output.resumen.total_partidos).toBe(6);
  });

  test('todos los partidos quedan asignados con suficientes dias y canchas', () => {
    const input = inputBase();
    const output = generarCronograma(input);
    expect(output.partidos_pendientes).toHaveLength(0);
    expect(output.resumen.total_asignados).toBe(6);
  });

  test('no hay dos partidos en la misma cancha al mismo tiempo', () => {
    const input = inputBase();
    const output = generarCronograma(input);
    const claves = output.partidos_asignados.map(
      (p) => `${p.cancha_id}|${p.fecha}|${p.hora_inicio}`
    );
    const unicos = new Set(claves);
    expect(unicos.size).toBe(claves.length);
  });

  test('ningun equipo juega dos partidos al mismo tiempo', () => {
    const input = inputBase();
    const output = generarCronograma(input);
    for (const partido of output.partidos_asignados) {
      const conflicto = output.partidos_asignados.find(
        (p) =>
          p.id_temp !== partido.id_temp &&
          p.fecha === partido.fecha &&
          p.hora_inicio === partido.hora_inicio &&
          (p.equipo_local_id === partido.equipo_local_id ||
            p.equipo_local_id === partido.equipo_visitante_id ||
            p.equipo_visitante_id === partido.equipo_local_id ||
            p.equipo_visitante_id === partido.equipo_visitante_id)
      );
      expect(conflicto).toBeUndefined();
    }
  });

  test('respeta el descanso minimo de 120 minutos entre partidos del mismo equipo', () => {
    const input = inputBase();
    const output = generarCronograma(input);
    for (const equipo of input.equipos) {
      const partidos_equipo = output.partidos_asignados
        .filter(
          (p) =>
            p.equipo_local_id === equipo.id || p.equipo_visitante_id === equipo.id
        )
        .sort((a, b) => {
          if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
          return a.hora_inicio.localeCompare(b.hora_inicio);
        });

      for (let i = 1; i < partidos_equipo.length; i++) {
        const anterior = partidos_equipo[i - 1];
        const actual = partidos_equipo[i];
        if (anterior.fecha === actual.fecha) {
          const fin_anterior =
            parseInt(anterior.hora_fin.split(':')[0]) * 60 +
            parseInt(anterior.hora_fin.split(':')[1]);
          const inicio_actual =
            parseInt(actual.hora_inicio.split(':')[0]) * 60 +
            parseInt(actual.hora_inicio.split(':')[1]);
          expect(inicio_actual - fin_anterior).toBeGreaterThanOrEqual(120);
        }
      }
    }
  });

  test('ningun equipo juega mas de 2 partidos por dia', () => {
    const input = inputBase();
    const output = generarCronograma(input);
    for (const equipo of input.equipos) {
      for (const fecha of input.dias_habilitados) {
        const partidos_dia = output.partidos_asignados.filter(
          (p) =>
            p.fecha === fecha &&
            (p.equipo_local_id === equipo.id || p.equipo_visitante_id === equipo.id)
        );
        expect(partidos_dia.length).toBeLessThanOrEqual(2);
      }
    }
  });

  test('ningun entrenador esta en dos partidos al mismo tiempo', () => {
    const input = inputBase();
    const output = generarCronograma(input);
    const coachPartidos = new Map<string, string[]>();

    for (const partido of output.partidos_asignados) {
      const local = input.equipos.find((e) => e.id === partido.equipo_local_id)!;
      const visitante = input.equipos.find((e) => e.id === partido.equipo_visitante_id)!;
      const clave = `${partido.fecha}|${partido.hora_inicio}`;

      for (const coach_id of [local.coach_id, visitante.coach_id]) {
        if (!coachPartidos.has(coach_id)) coachPartidos.set(coach_id, []);
        const claves = coachPartidos.get(coach_id)!;
        expect(claves).not.toContain(clave);
        claves.push(clave);
      }
    }
  });

  test('reporta conflicto cuando no hay canchas para una categoria', () => {
    const input = inputBase();
    input.canchas[0].categorias_permitidas = ['cat_otra'];
    const output = generarCronograma(input);
    expect(output.conflictos.some((c) => c.tipo === 'sin_canchas_para_categoria')).toBe(true);
    expect(output.partidos_pendientes.length).toBe(6);
  });

  test('reporta conflicto cuando los dias son insuficientes', () => {
    const input = inputBase();
    // Solo 1 dia con 2 horas disponibles no alcanza para 6 partidos de 60min con restricciones
    input.dias_habilitados = ['2026-06-01'];
    input.canchas[0].disponibilidad = [
      { fecha: '2026-06-01', hora_inicio: '08:00', hora_fin: '10:00' },
    ];
    const output = generarCronograma(input);
    expect(output.partidos_pendientes.length).toBeGreaterThan(0);
    expect(output.conflictos.some((c) => c.tipo === 'dias_insuficientes')).toBe(true);
  });

  test('el resultado es una funcion pura: misma entrada produce misma salida', () => {
    const input = inputBase();
    const output1 = generarCronograma(input);
    const output2 = generarCronograma(input);
    expect(output1.resumen.total_asignados).toBe(output2.resumen.total_asignados);
    expect(output1.resumen.total_pendientes).toBe(output2.resumen.total_pendientes);
  });

  test('calcula correctamente la fecha fin con los partidos asignados', () => {
    const input = inputBase();
    const output = generarCronograma(input);
    expect(output.resumen.fecha_fin_calculada).toBeTruthy();
    expect(output.resumen.fecha_fin_calculada >= output.resumen.fecha_inicio).toBe(true);
  });

  test('funciona con 2 equipos: genera exactamente 1 partido', () => {
    const input = inputBase();
    input.equipos = [
      { id: 'eq1', nombre: 'Equipo A', categoria_id: 'cat1', coach_id: 'coach1' },
      { id: 'eq2', nombre: 'Equipo B', categoria_id: 'cat1', coach_id: 'coach2' },
    ];
    const output = generarCronograma(input);
    expect(output.resumen.total_partidos).toBe(1);
  });

  test('funciona con 3 equipos: genera exactamente 3 partidos', () => {
    const input = inputBase();
    input.equipos = [
      { id: 'eq1', nombre: 'Equipo A', categoria_id: 'cat1', coach_id: 'coach1' },
      { id: 'eq2', nombre: 'Equipo B', categoria_id: 'cat1', coach_id: 'coach2' },
      { id: 'eq3', nombre: 'Equipo C', categoria_id: 'cat1', coach_id: 'coach3' },
    ];
    const output = generarCronograma(input);
    expect(output.resumen.total_partidos).toBe(3);
  });
});
