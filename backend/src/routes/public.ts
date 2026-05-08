import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// GET /api/public/torneos/:slug
router.get('/torneos/:slug', async (req: Request, res: Response) => {
  const torneo = await prisma.tournament.findUnique({
    where: { slug: req.params.slug },
    include: {
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
            orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
          },
        },
      },
    },
  });

  if (!torneo) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }
  res.json(torneo);
});

export default router;
