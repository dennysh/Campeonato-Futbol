import { Router, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/clubes
router.get('/', async (req: AuthRequest, res: Response) => {
  const clubes = await prisma.club.findMany({
    where: { organizador_id: req.userId },
    orderBy: { nombre: 'asc' },
  });
  res.json(clubes);
});

// POST /api/clubes
router.post('/', async (req: AuthRequest, res: Response) => {
  const { nombre, ciudad } = req.body;
  if (!nombre) { res.status(400).json({ error: 'Nombre es obligatorio' }); return; }

  const club = await prisma.club.create({
    data: { nombre, ciudad: ciudad || null, organizador_id: req.userId },
  });
  res.status(201).json(club);
});

// PATCH /api/clubes/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { nombre, ciudad } = req.body;
  const club = await prisma.club.update({
    where: { id: req.params.id, organizador_id: req.userId },
    data: {
      ...(nombre !== undefined ? { nombre } : {}),
      ...(ciudad !== undefined ? { ciudad: ciudad || null } : {}),
    },
  });
  res.json(club);
});

// DELETE /api/clubes/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.club.delete({ where: { id: req.params.id, organizador_id: req.userId } });
  res.status(204).end();
});

export default router;
