import { Router, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/torneos/:torneoId/partidos/:matchId/stats
router.get('/', async (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      home_team: {
        include: { players: { orderBy: [{ numero: 'asc' }, { nombre: 'asc' }] } },
      },
      away_team: {
        include: { players: { orderBy: [{ numero: 'asc' }, { nombre: 'asc' }] } },
      },
      field: true,
      player_stats: true,
    },
  });

  if (!match) { res.status(404).json({ error: 'Partido no encontrado' }); return; }
  res.json(match);
});

// PUT /api/torneos/:torneoId/partidos/:matchId/stats
router.put('/', async (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const { home_score, away_score, stats } = req.body;
  // stats: { player_id, goles, asistencias, amarillas, rojas, faltas }[]

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: matchId },
      data: {
        home_score: home_score != null ? Number(home_score) : null,
        away_score: away_score != null ? Number(away_score) : null,
        status: 'jugado',
      },
    });

    if (Array.isArray(stats)) {
      for (const s of stats) {
        await tx.playerMatchStat.upsert({
          where: { player_id_match_id: { player_id: s.player_id, match_id: matchId } },
          create: {
            player_id: s.player_id,
            match_id: matchId,
            goles: s.goles ?? 0,
            asistencias: s.asistencias ?? 0,
            amarillas: s.amarillas ?? 0,
            rojas: s.rojas ?? 0,
            faltas: s.faltas ?? 0,
          },
          update: {
            goles: s.goles ?? 0,
            asistencias: s.asistencias ?? 0,
            amarillas: s.amarillas ?? 0,
            rojas: s.rojas ?? 0,
            faltas: s.faltas ?? 0,
          },
        });
      }
    }
  });

  res.json({ ok: true });
});

export default router;
