/**
 * Admin: Webhook Event Viewer + Replay + DLQ Management
 * GET  /api/admin/webhooks          — list events with filters
 * GET  /api/admin/webhooks/stats    — observability stats
 * POST /api/admin/webhooks/replay   — replay single event
 * POST /api/admin/webhooks/replay-batch — replay failed batch
 * GET  /api/admin/webhooks/dlq      — dead-letter queue viewer
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWebhookStats, replayWebhookEvent } from '@/lib/webhook-engine';
import { apiLogger, getCorrelationId } from '@/lib/observability';

// ── GET /api/admin/webhooks ──────────────────────────────────
export async function GET(req: NextRequest) {
  const correlationId = getCorrelationId(req);
  const { searchParams } = new URL(req.url);

  const source = searchParams.get('source') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const eventType = searchParams.get('eventType') ?? undefined;
  const organizationId = searchParams.get('organizationId') ?? undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const skip = (page - 1) * limit;

  const subpath = searchParams.get('view');

  try {
    // Stats view
    if (subpath === 'stats') {
      const stats = await getWebhookStats(organizationId);
      return NextResponse.json({ stats, correlationId });
    }

    // DLQ view
    if (subpath === 'dlq') {
      const dlq = await prisma.webhookDeadLetter.findMany({
        where: organizationId ? { organizationId } : {},
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      });
      const total = await prisma.webhookDeadLetter.count({
        where: organizationId ? { organizationId } : {},
      });
      return NextResponse.json({ dlq, total, page, limit, correlationId });
    }

    // Event list
    const where: Record<string, unknown> = {};
    if (source) where.source = source;
    if (status) where.status = status;
    if (eventType) where.eventType = eventType;
    if (organizationId) where.organizationId = organizationId;

    const [events, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          source: true,
          eventType: true,
          eventId: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          correlationId: true,
          tenantId: true,
          processingMs: true,
          failureReason: true,
          deadLettered: true,
          nextRetryAt: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      prisma.webhookEvent.count({ where }),
    ]);

    apiLogger.info('Admin webhook list', { correlationId, total, page });
    return NextResponse.json({ events, total, page, limit, correlationId });
  } catch (error) {
    apiLogger.error('Admin webhook list failed', { correlationId, error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch webhook events' }, { status: 500 });
  }
}

// ── POST /api/admin/webhooks ─────────────────────────────────
export async function POST(req: NextRequest) {
  const correlationId = getCorrelationId(req);

  try {
    const body = await req.json() as {
      action: 'replay' | 'replay-batch' | 'inspect';
      webhookEventId?: string;
      replayedBy?: string;
      filters?: { source?: string; organizationId?: string };
    };

    if (body.action === 'inspect') {
      if (!body.webhookEventId) {
        return NextResponse.json({ error: 'webhookEventId required' }, { status: 400 });
      }
      const event = await prisma.webhookEvent.findUnique({
        where: { id: body.webhookEventId },
        include: { deadLetterEntry: true },
      });
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      return NextResponse.json({ event, correlationId });
    }

    if (body.action === 'replay') {
      if (!body.webhookEventId) {
        return NextResponse.json({ error: 'webhookEventId required' }, { status: 400 });
      }

      // Get the event to determine which handler to use
      const event = await prisma.webhookEvent.findUnique({ where: { id: body.webhookEventId } });
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

      const handler = await resolveHandler(event.source, event.eventType);
      const result = await replayWebhookEvent(body.webhookEventId, handler, body.replayedBy);

      apiLogger.info('Admin webhook replay', {
        correlationId,
        webhookEventId: body.webhookEventId,
        success: result.success,
      });

      return NextResponse.json({ ...result, correlationId });
    }

    if (body.action === 'replay-batch') {
      // Replay all failed/dead-lettered events matching filters
      const where: Record<string, unknown> = {
        status: { in: ['failed', 'dead_lettered'] },
      };
      if (body.filters?.source) where.source = body.filters.source;
      if (body.filters?.organizationId) where.organizationId = body.filters.organizationId;

      const events = await prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      let replayed = 0;
      let replayFailed = 0;

      for (const event of events) {
        const handler = await resolveHandler(event.source, event.eventType);
        const result = await replayWebhookEvent(event.id, handler, body.replayedBy);
        if (result.success) replayed++;
        else replayFailed++;
      }

      apiLogger.info('Admin webhook batch replay', {
        correlationId,
        replayed,
        replayFailed,
        total: events.length,
      });

      return NextResponse.json({ replayed, replayFailed, total: events.length, correlationId });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    apiLogger.error('Admin webhook action failed', { correlationId, error: String(error) });
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}

// ── Handler resolver ─────────────────────────────────────────

async function resolveHandler(
  source: string,
  eventType: string
): Promise<(payload: Record<string, unknown>) => Promise<void>> {
  // Import the appropriate processing function based on source
  // These are lightweight re-processors that skip signature verification
  switch (source) {
    case 'stripe': {
      const { processStripeEventDirect } = await import('./stripe-processor');
      return (payload) => processStripeEventDirect(eventType, payload);
    }
    case 'goaffpro': {
      const { processGoAffProEventDirect } = await import('./goaffpro-processor');
      return (payload) => processGoAffProEventDirect(eventType, payload);
    }
    case 'brevo': {
      const { processBrevoEventDirect } = await import('./brevo-processor');
      return (payload) => processBrevoEventDirect(eventType, payload);
    }
    default:
      return async () => {
        console.log(`[REPLAY] No handler for source: ${source}`);
      };
  }
}
