import { Router, Request, Response } from 'express';
import { generarCronograma } from '../engine/generarCronograma';
import { confirmarTorneo } from '../services/confirmarTorneo';
import type { ScheduleInput } from '../types/schedule';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/cronograma/preview — genera sin guardar en DB
router.post('/preview', (req: Request, res: Response) => {
  const input: ScheduleInput = req.body;
  if (!input?.equipos || !input?.canchas || !input?.dias_habilitados) {
    res.status(400).json({ error: 'Datos incompletos' });
    return;
  }
  const output = generarCronograma(input);
  res.json(output);
});

// POST /api/cronograma/confirmar — guarda todo en DB en una transaccion
router.post('/confirmar', requireAuth, async (req: AuthRequest, res: Response) => {
  const { nombre, fecha_inicio, categorias, config_canchas, dias_habilitados } = req.body;

  if (!nombre || !fecha_inicio || !categorias?.length || !config_canchas || !dias_habilitados?.length) {
    res.status(400).json({ error: 'Datos incompletos para confirmar el torneo' });
    return;
  }

  try {
    const result = await confirmarTorneo({ nombre, fecha_inicio, categorias, config_canchas, dias_habilitados, organizador_id: req.userId });
    res.status(201).json(result);
  } catch (err) {
    console.error('Error al confirmar torneo:', err);
    res.status(500).json({ error: 'Error interno al guardar el torneo' });
  }
});

export default router;
