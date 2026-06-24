import { Router, Request, Response } from 'express';
import { linkEmailToSession } from '../services/identity';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { session_id, email } = req.body;

    if (!session_id || !email) {
      return res.status(400).json({
        error: 'Missing required fields: session_id, email',
      });
    }

    const identity = await linkEmailToSession(session_id, email);

    return res.status(201).json({
      identity_id: identity.id,
      session_id: identity.sessionId,
      email: identity.email,
    });
  } catch (error) {
    console.error('[IDENTIFY] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;