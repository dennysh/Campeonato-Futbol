import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/torneos
router.get('/', async (req: AuthRequest, res: Response) => {
  const torneos = await prisma.tournament.findMany({
    where: { organizador_id: req.userId },
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { categories: true } },
      schedule_versions: {
        take: 1,
        orderBy: { version: 'desc' },
        include: { _count: { select: { matches: true } } },
      },
    },
  });
  res.json(torneos);
});

// GET /api/torneos/:id — torneo con partidos para el calendario
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const torneo = await prisma.tournament.findUnique({
    where: { id: req.params.id, organizador_id: req.userId },
    include: {
      categories: { include: { teams: true } },
      fields: true,
      tournament_days: { orderBy: { fecha: 'asc' } },
      schedule_versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          matches: {
            include: {
              home_team: { include: { category: true } },
              away_team: { include: { category: true } },
              field: true,
            },
          },
        },
      },
    },
  });

  if (!torneo) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }
  res.json(torneo);
});

// PATCH /api/torneos/:id/partidos/:matchId — mover partido (drag & drop)
router.patch('/:id/partidos/:matchId', async (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const { fecha, hora_inicio, hora_fin, field_id } = req.body;
  const forzar = req.query.forzar === 'true';

  if (!fecha || !hora_inicio || !hora_fin) {
    res.status(400).json({ error: 'fecha, hora_inicio y hora_fin son obligatorios' });
    return;
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      home_team: true,
      away_team: true,
      schedule_version: { include: { tournament: true } },
    },
  });

  if (!match) { res.status(404).json({ error: 'Partido no encontrado' }); return; }

  // Detectar conflictos
  const conflictos: string[] = [];

  const mismoSlot = await prisma.match.findFirst({
    where: {
      id: { not: matchId },
      schedule_version_id: match.schedule_version_id,
      field_id: field_id ?? match.field_id,
      fecha,
      hora_inicio,
    },
  });
  if (mismoSlot) conflictos.push('La cancha ya tiene un partido en ese horario');

  const localOcupado = await prisma.match.findFirst({
    where: {
      id: { not: matchId },
      schedule_version_id: match.schedule_version_id,
      fecha,
      hora_inicio,
      OR: [
        { home_team_id: match.home_team_id },
        { away_team_id: match.home_team_id },
      ],
    },
  });
  if (localOcupado) conflictos.push(`${match.home_team.nombre} ya tiene partido en ese horario`);

  const visitanteOcupado = await prisma.match.findFirst({
    where: {
      id: { not: matchId },
      schedule_version_id: match.schedule_version_id,
      fecha,
      hora_inicio,
      OR: [
        { home_team_id: match.away_team_id },
        { away_team_id: match.away_team_id },
      ],
    },
  });
  if (visitanteOcupado) conflictos.push(`${match.away_team.nombre} ya tiene partido en ese horario`);

  // Si hay conflictos y no se forzó → advertir, no bloquear
  if (conflictos.length > 0 && !forzar) {
    res.status(409).json({ error: 'Conflicto de horario', conflictos, puede_forzar: true });
    return;
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      fecha,
      hora_inicio,
      hora_fin,
      ...(field_id ? { field_id } : {}),
    },
    include: { home_team: true, away_team: true, field: true },
  });

  res.json(updated);
});

// PATCH /api/torneos/:id/publicar
router.patch('/:id/publicar', async (req: AuthRequest, res: Response) => {
  const torneo = await prisma.tournament.update({
    where: { id: req.params.id, organizador_id: req.userId },
    data: { status: 'publicado' },
  });
  res.json(torneo);
});

export default router;
