import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cronogramaRouter from './routes/cronograma';
import torneosRouter from './routes/torneos';
import publicRouter from './routes/public';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/cronograma', cronogramaRouter);
app.use('/api/torneos', torneosRouter);
app.use('/api/public', publicRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
