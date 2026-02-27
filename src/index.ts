import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import campaignsRouter from './routes/campaigns';
import contactsRouter from './routes/contacts';
import webhooksRouter from './routes/webhooks';
import analyticsRouter from './routes/analytics';
import demexRouter from './routes/demex';
import simulationRouter from './routes/simulation';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for SendGrid inbound parse

// Health
app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'ai-sales', version: '1.0.0', ts: new Date().toISOString() });
});

// Routes
app.use('/api/campaigns', campaignsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/demex', demexRouter);
app.use('/api/simulation', simulationRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`[AI-Sales] Backend running on port ${PORT}`);
  console.log(`  DEMEX: ${process.env.DEMEX_URL}`);
  console.log(`  ChainReaction: ${process.env.CHAIN_REACTION_URL}`);
  console.log(`  AI-PM: ${process.env.AIPM_URL}`);
});

export default app;
