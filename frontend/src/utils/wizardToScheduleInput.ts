import type { ScheduleInput, EquipoInput, CategoriaInput, CanchaInput, CoachInput } from '../types/schedule';
import type { CategoriaSeleccionada, ConfigCanchas, ConfigHorario, DiaHabilitado } from '../store/wizardStore';

export function wizardToScheduleInput(
  categorias: CategoriaSeleccionada[],
  config_canchas: ConfigCanchas,
  config_horario: ConfigHorario,
  dias_habilitados: DiaHabilitado[]
): ScheduleInput {
  const equipos: EquipoInput[] = [];
  const categoriasInput: CategoriaInput[] = [];
  const coachesInput: CoachInput[] = [];

  for (const cat of categorias) {
    const cat_id = `sub${cat.sub}_${cat.genero}`;
    categoriasInput.push({
      id: cat_id,
      nombre: `Sub-${cat.sub} ${cat.genero === 'masculino' ? 'Masculino' : 'Femenino'}`,
      modalidad: 'futbol',
    });
    for (let i = 1; i <= cat.num_equipos; i++) {
      const eq_id = `${cat_id}_eq${i}`;
      const coach_id = `coach_${eq_id}`;
      equipos.push({ id: eq_id, nombre: `Equipo ${i}`, categoria_id: cat_id, coach_id });
      coachesInput.push({ id: coach_id, nombre: `Entrenador ${i}` });
    }
  }

  const canchas: CanchaInput[] = config_canchas.canchas
    .filter((cancha) => cancha.categorias_ids.length > 0)
    .map((cancha) => {
      const disponibilidad = dias_habilitados
        .flatMap((dia) => {
          const cfg = dia.canchas_config?.find((c) => c.cancha_id === cancha.id);
          if (cfg && !cfg.activa) return [];
          return [{
            fecha: dia.fecha,
            hora_inicio: cfg?.hora_inicio ?? config_horario.hora_inicio,
            hora_fin: cfg?.hora_fin ?? config_horario.hora_fin,
          }];
        });

      return {
        id: `cancha${cancha.id}`,
        nombre: cancha.nombre,
        categorias_permitidas: cancha.categorias_ids,
        disponibilidad,
      };
    });

  const fechas = dias_habilitados.map((d) => d.fecha);

  return {
    equipos,
    categorias: categoriasInput,
    canchas,
    coaches: coachesInput,
    dias_habilitados: fechas,
    reglas: {
      duracion_partido_minutos: 60,
      descanso_minimo_minutos: 120,
      max_partidos_por_dia: 2,
    },
  };
}
