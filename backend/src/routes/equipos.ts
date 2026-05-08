import { Router, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/torneos/:torneoId/equipos — categorías con sus equipos
router.get('/', async (req: AuthRequest, res: Response) => {
  const { torneoId } = req.params;

  const torneo = await prisma.tournament.findUnique({
    where: { id: torneoId, organizador_id: req.userId },
  });
  if (!torneo) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }

  const categorias = await prisma.category.findMany({
    where: { tournament_id: torneoId },
    include: {
      teams: {
        include: {
          club: true,
          _count: { select: { players: true } },
        },
        orderBy: { nombre: 'asc' },
      },
    },
    orderBy: { sub: 'asc' },
  });

  res.json(categorias);
});

// PATCH /api/torneos/:torneoId/equipos/:teamId — renombrar equipo / asignar club
router.patch('/:teamId', async (req: AuthRequest, res: Response) => {
  const { torneoId, teamId } = req.params;
  const { nombre, club_id } = req.body;

  const team = await prisma.team.findFirst({
    where: { id: teamId, category: { tournament_id: torneoId } },
  });
  if (!team) { res.status(404).json({ error: 'Equipo no encontrado' }); return; }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(nombre !== undefined ? { nombre } : {}),
      ...(club_id !== undefined ? { club_id: club_id || null } : {}),
    },
    include: { club: true, _count: { select: { players: true } } },
  });

  res.json(updated);
});

// GET /api/torneos/:torneoId/equipos/:teamId/jugadores
router.get('/:teamId/jugadores', async (req: AuthRequest, res: Response) => {
  const { torneoId, teamId } = req.params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, category: { tournament_id: torneoId } },
    include: {
      club: true,
      category: true,
      players: { orderBy: [{ numero: 'asc' }, { nombre: 'asc' }] },
    },
  });
  if (!team) { res.status(404).json({ error: 'Equipo no encontrado' }); return; }

  res.json(team);
});

// POST /api/torneos/:torneoId/equipos/:teamId/jugadores
router.post('/:teamId/jugadores', async (req: AuthRequest, res: Response) => {
  const { torneoId, teamId } = req.params;
  const { nombre, numero, posicion } = req.body;

  if (!nombre) { res.status(400).json({ error: 'El nombre es obligatorio' }); return; }

  const team = await prisma.team.findFirst({
    where: { id: teamId, category: { tournament_id: torneoId } },
  });
  if (!team) { res.status(404).json({ error: 'Equipo no encontrado' }); return; }

  const player = await prisma.player.create({
    data: {
      team_id: teamId,
      nombre,
      numero: numero != null && numero !== '' ? Number(numero) : null,
      posicion: posicion || null,
    },
  });

  res.status(201).json(player);
});

// PATCH /api/torneos/:torneoId/equipos/:teamId/jugadores/:playerId
router.patch('/:teamId/jugadores/:playerId', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params;
  const { nombre, numero, posicion } = req.body;

  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      ...(nombre !== undefined ? { nombre } : {}),
      ...(numero !== undefined ? { numero: numero === '' || numero == null ? null : Number(numero) } : {}),
      ...(posicion !== undefined ? { posicion: posicion || null } : {}),
    },
  });

  res.json(player);
});

// DELETE /api/torneos/:torneoId/equipos/:teamId/jugadores/:playerId
router.delete('/:teamId/jugadores/:playerId', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params;
  await prisma.player.delete({ where: { id: playerId } });
  res.status(204).end();
});

export default router;
