import { Router, Request, Response } from 'express';
import { getVisitors } from '../services/session';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getVisitors(page, limit);
    return res.json(result);
  } catch (error) {
    console.error('[VISITORS] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;