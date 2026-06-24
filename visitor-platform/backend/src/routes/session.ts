import { Router, Request, Response } from 'express';
import { getSessionById, finalizeSession } from '../services/session';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await getSessionById(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({
      id: session.id,
      anonymous_id: session.anonymousId,
      visitor_id: session.visitorId,
      email: session.visitor?.email ?? null,
      start_time: session.startTime.toISOString(),
      end_time: session.endTime?.toISOString() ?? null,
      duration_seconds: session.durationSeconds,
      entry_page: session.entryPage,
      exit_page: session.exitPage,
      conversion_status: session.conversionStatus,
      intent_score: session.intentScore,
      utm_source: session.utmSource,
      utm_medium: session.utmMedium,
      utm_campaign: session.utmCampaign,
      referrer: session.referrer,
      events: session.events.map((e) => ({
        id: e.id,
        type: e.type,
        url: e.url,
        timestamp: e.timestamp.toISOString(),
        metadata: e.metadata,
      })),
    });
  } catch (error) {
    console.error('[SESSION] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/finalize', async (req: Request, res: Response) => {
  try {
    const { anonymous_id } = req.body;
    if (!anonymous_id) {
      return res.status(400).json({ error: 'Missing anonymous_id' });
    }

    const session = await finalizeSession(anonymous_id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({
      id: session.id,
      duration_seconds: session.durationSeconds,
      end_time: session.endTime?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[FINALIZE] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;