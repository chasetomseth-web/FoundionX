import { Router, Request, Response } from 'express';
import { createOrUpdateSession } from '../services/session';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { anonymous_id, type, url, timestamp, metadata } = req.body;

    if (!anonymous_id || !type || !url) {
      return res.status(400).json({
        error: 'Missing required fields: anonymous_id, type, url',
      });
    }

    const result = await createOrUpdateSession(
      anonymous_id,
      type,
      url,
      timestamp || new Date().toISOString(),
      metadata
    );

    return res.status(201).json({
      session_id: result.session.id,
      anonymous_id: result.session.anonymousId,
      event_id: result.event.id,
    });
  } catch (error) {
    console.error('[EVENT] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;