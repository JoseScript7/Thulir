import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import routes from './routes';
import { startMockGenerator } from './mockGenerator';
import { recomputeAll } from './ieiEngine';

const app = express();

app.use(cors());
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────────────────────

app.use(routes);

// ─── Start server ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Thulir API listening on :${PORT}`);

  // Start mock generator if USE_MOCK_DATA is 'true' or unset (default on)
  const useMock = process.env.USE_MOCK_DATA ?? 'true';
  if (useMock === 'true') {
    startMockGenerator();
  }

  // Run IEI engine once on startup (after a short delay so mock data can land)
  setTimeout(() => {
    recomputeAll();
  }, 5000);

  // Schedule IEI engine every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    recomputeAll();
  });
  console.log('⏱  IEI engine scheduled: every 2 minutes');
});

export default app;
