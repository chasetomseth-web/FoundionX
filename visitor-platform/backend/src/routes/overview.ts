import { Router, Request, Response } from 'express';
import { getOverview } from '../services/session';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const overview = await getOverview();
    return res.json(overview);
  } catch (error) {
    console.error('[OVERVIEW] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;