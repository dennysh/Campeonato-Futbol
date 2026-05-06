import { PrismaClient } from '@prisma/client';
import { generarCronograma } from '../engine/generarCronograma';
import type { CategoriaSeleccionada } from '../types/wizard';

const prisma = new PrismaClient();

interface ConfigCanchaItem {
  id: number;
  nombre: string;
  categorias_ids: string[];
}

interface ConfigCanchas {
  num_canchas: number;
  canchas: ConfigCanchaItem[];
}

interface ConfigHorario {
  hora_inicio: string;
  hora_fin: string;
}

interface CanchaConfigDia {
  cancha_id: number;
  activa: boolean;
  hora_inicio?: string;
  hora_fin?: string;
}

interface DiaHabilitado {
  fecha: string;
  canchas_config?: CanchaConfigDia[];
}

interface ConfirmarInput {
  nombre: string;
  fecha_inicio: string;
  categorias: CategoriaSeleccionada[];
  config_canchas: ConfigCanchas;
  config_horario: ConfigHorario;
  dias_habilitados: DiaHabilitado[];
  organizador_id?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60) + '-' + Date.now();
}

function buildScheduleInput(
  categorias: CategoriaSeleccionada[],
  config_canchas: ConfigCanchas,
  config_horario: ConfigHorario,
  dias_habilitados: DiaHabilitado[]
) {
  const equiposInput: { id: string; nombre: string; categoria_id: string; coach_id: string }[] = [];
  const categoriasInput: { id: string; nombre: string; modalidad: string }[] = [];
  const coachesInput: { id: string; nombre: string }[] = [];

  for (const cat of categorias) {
    const cat_id = `sub${cat.sub}_${cat.genero}`;
    categoriasInput.push({
      id: cat_id,
      nombre: `Sub-${cat.sub} ${cat.genero === 'masculino' ? 'Masculino' : 'Femenino'}`,
      modalidad: 'futbol',
    });
    for (let i = 1; i <= cat.num_equipos; i++) {
      const eq_id = `${cat_id}_eq${i}`;
      equiposInput.push({ id: eq_id, nombre: `Equipo ${i}`, categoria_id: cat_id, coach_id: `coach_${eq_id}` });
      coachesInput.push({ id: `coach_${eq_id}`, nombre: `Entrenador ${i}` });
    }
  }

  const canchasInput = config_canchas.canchas
    .filter((c) => c.categorias_ids.length > 0)
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

  return {
    equipos: equiposInput,
    categorias: categoriasInput,
    canchas: canchasInput,
    coaches: coachesInput,
    dias_habilitados: dias_habilitados.map((d) => d.fecha),
    reglas: { duracion_partido_minutos: 60, descanso_minimo_minutos: 120, max_partidos_por_dia: 2 },
  };
}

export async function confirmarTorneo(data: ConfirmarInput) {
  const scheduleInput = buildScheduleInput(data.categorias, data.config_canchas, data.config_horario, data.dias_habilitados);
  const scheduleOutput = generarCronograma(scheduleInput);

  const result = await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        nombre: data.nombre,
        slug: slugify(data.nombre),
        fecha_inicio: data.fecha_inicio,
        ...(data.organizador_id ? { organizador_id: data.organizador_id } : {}),
      },
    });

    const categoryMap = new Map<string, string>();
    for (const cat of data.categorias) {
      const cat_id_temp = `sub${cat.sub}_${cat.genero}`;
      const created = await tx.category.create({
        data: {
          tournament_id: tournament.id,
          nombre: `Sub-${cat.sub} ${cat.genero === 'masculino' ? 'Masculino' : 'Femenino'}`,
          sub: cat.sub,
          genero: cat.genero,
        },
      });
      categoryMap.set(cat_id_temp, created.id);
    }

    const teamMap = new Map<string, string>();
    for (const eq of scheduleInput.equipos) {
      const real_cat_id = categoryMap.get(eq.categoria_id)!;
      const created = await tx.team.create({
        data: { category_id: real_cat_id, nombre: eq.nombre },
      });
      teamMap.set(eq.id, created.id);
    }

    const fieldMap = new Map<string, string>();
    for (const cancha of scheduleInput.canchas) {
      const created = await tx.field.create({
        data: { tournament_id: tournament.id, nombre: cancha.nombre },
      });
      fieldMap.set(cancha.id, created.id);
    }

    for (const dia of data.dias_habilitados) {
      await tx.tournamentDay.create({
        data: { tournament_id: tournament.id, fecha: dia.fecha },
      });
    }

    const version = await tx.scheduleVersion.create({
      data: { tournament_id: tournament.id, version: 1, status: 'borrador' },
    });

    for (const partido of scheduleOutput.partidos_asignados) {
      await tx.match.create({
        data: {
          schedule_version_id: version.id,
          field_id: fieldMap.get(partido.cancha_id)!,
          home_team_id: teamMap.get(partido.equipo_local_id)!,
          away_team_id: teamMap.get(partido.equipo_visitante_id)!,
          fecha: partido.fecha,
          hora_inicio: partido.hora_inicio,
          hora_fin: partido.hora_fin,
          categoria_id: categoryMap.get(partido.categoria_id) ?? partido.categoria_id,
        },
      });
    }

    return {
      tournament_id: tournament.id,
      schedule_version_id: version.id,
      total_partidos: scheduleOutput.resumen.total_asignados,
      pendientes: scheduleOutput.resumen.total_pendientes,
    };
  });

  return result;
}
