import express from 'express';
import cors from 'cors';
import eventRouter from './routes/event';
import identifyRouter from './routes/identify';
import sessionRouter from './routes/session';
import overviewRouter from './routes/overview';
import visitorsRouter from './routes/visitors';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/event', eventRouter);
app.use('/identify', identifyRouter);
app.use('/session', sessionRouter);
app.use('/overview', overviewRouter);
app.use('/visitors', visitorsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`[VISITOR PLATFORM] Server running on http://localhost:${PORT}`);
  console.log(`[VISITOR PLATFORM] Health: http://localhost:${PORT}/health`);
});