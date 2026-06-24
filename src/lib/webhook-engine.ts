/**
 * Webhook Reliability Engine
 * Centralized ingestion service with idempotency, ordering, retry, DLQ, and observability
 */

import { prisma } from './prisma';
import { acquireLock, releaseLock, markEventSeen } from './redis-lock';
import { webhookLogger } from './observability';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export type WebhookSource = 'stripe' | 'goaffpro' | 'brevo';

export interface WebhookIngestionOptions {
  source: WebhookSource;
  eventType: string;
  eventId: string;
  rawBody: string;
  payload: Record<string, unknown>;
  organizationId?: string;
  tenantId?: string;
  correlationId?: string;
}

export interface WebhookProcessResult {
  status: 'processed' | 'duplicate' | 'locked' | 'failed' | 'dead_lettered';
  webhookId: string;
  correlationId: string;
  durationMs: number;
}

// ============================================================
// RETRY CONFIG PER PROVIDER
// ============================================================

const RETRY_CONFIG: Record<WebhookSource, { maxAttempts: number; backoffBase: number }> = {
  stripe: { maxAttempts: 5, backoffBase: 2 },
  goaffpro: { maxAttempts: 4, backoffBase: 3 },
  brevo: { maxAttempts: 3, backoffBase: 5 },
};

// ============================================================
// FINGERPRINT GENERATION
// ============================================================

function generateFingerprint(source: WebhookSource, eventId: string, eventType: string): string {
  return crypto
    .createHash('sha256')
    .update(`${source}:${eventId}:${eventType}`)
    .digest('hex')
    .slice(0, 32);
}

// ============================================================
// CORE INGESTION FUNCTION
// ============================================================

/**
 * Ingest a webhook event with full idempotency, locking, and persistence.
 * Returns early if duplicate. Acquires Redis lock before processing.
 */
export async function ingestWebhook(
  options: WebhookIngestionOptions,
  handler: (payload: Record<string, unknown>) => Promise<void>
): Promise<WebhookProcessResult> {
  const startTime = Date.now();
  const correlationId = options.correlationId ?? crypto.randomUUID();
  const fingerprint = generateFingerprint(options.source, options.eventId, options.eventType);
  const lockKey = `webhook:${fingerprint}`;
  const config = RETRY_CONFIG[options.source];

  webhookLogger.info('Webhook received', {
    source: options.source,
    eventType: options.eventType,
    eventId: options.eventId,
    correlationId,
    tenantId: options.tenantId,
  });

  // ── Step 1: Redis idempotency fast-path ──────────────────
  const isNew = await markEventSeen(`webhook:seen:${fingerprint}`);
  if (!isNew) {
    webhookLogger.info('Webhook duplicate (Redis fast-path)', { correlationId, eventId: options.eventId });
    // Still find the DB record to return the ID
    const existing = await prisma.webhookEvent.findUnique({ where: { eventId: options.eventId } });
    return {
      status: 'duplicate',
      webhookId: existing?.id ?? 'unknown',
      correlationId,
      durationMs: Date.now() - startTime,
    };
  }

  // ── Step 2: DB-level idempotency check ───────────────────
  const existingRecord = await prisma.webhookEvent.findUnique({
    where: { eventId: options.eventId },
  });
  if (existingRecord?.status === 'processed') {
    webhookLogger.info('Webhook duplicate (DB check)', { correlationId, eventId: options.eventId });
    return {
      status: 'duplicate',
      webhookId: existingRecord.id,
      correlationId,
      durationMs: Date.now() - startTime,
    };
  }

  // ── Step 3: Acquire distributed lock ─────────────────────
  const lockAcquired = await acquireLock(lockKey, 60_000);
  if (!lockAcquired) {
    webhookLogger.warn('Webhook lock contention', { correlationId, lockKey });
    return {
      status: 'locked',
      webhookId: existingRecord?.id ?? 'unknown',
      correlationId,
      durationMs: Date.now() - startTime,
    };
  }

  // ── Step 4: Persist event record ─────────────────────────
  const record = await prisma.webhookEvent.upsert({
    where: { eventId: options.eventId },
    create: {
      source: options.source,
      eventType: options.eventType,
      eventId: options.eventId,
      rawBody: options.rawBody,
      payload: options.payload,
      status: 'processing',
      organizationId: options.organizationId,
      tenantId: options.tenantId,
      correlationId,
      maxAttempts: config.maxAttempts,
    },
    update: {
      status: 'processing',
      attempts: { increment: 1 },
      correlationId,
    },
  });

  // ── Step 5: Execute handler ───────────────────────────────
  try {
    await handler(options.payload);

    const durationMs = Date.now() - startTime;
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
        processingMs: durationMs,
      },
    });

    webhookLogger.info('Webhook processed successfully', {
      correlationId,
      eventId: options.eventId,
      source: options.source,
      eventType: options.eventType,
      durationMs,
    });

    return { status: 'processed', webhookId: record.id, correlationId, durationMs };
  } catch (error) {
    const attempts = record.attempts + 1;
    const shouldRetry = attempts < config.maxAttempts;
    const backoffMs = Math.pow(config.backoffBase, attempts) * 1000;
    const failureReason = error instanceof Error ? error.message : 'Unknown error';

    webhookLogger.error('Webhook processing failed', {
      correlationId,
      eventId: options.eventId,
      source: options.source,
      eventType: options.eventType,
      attempts,
      shouldRetry,
      failureReason,
    });

    if (shouldRetry) {
      await prisma.webhookEvent.update({
        where: { id: record.id },
        data: {
          status: 'failed',
          failureReason,
          nextRetryAt: new Date(Date.now() + backoffMs),
        },
      });
    } else {
      // Move to dead-letter queue
      await prisma.webhookEvent.update({
        where: { id: record.id },
        data: {
          status: 'dead_lettered',
          failureReason,
          deadLettered: true,
          deadLetteredAt: new Date(),
        },
      });

      await prisma.webhookDeadLetter.create({
        data: {
          webhookEventId: record.id,
          source: options.source,
          eventType: options.eventType,
          eventId: options.eventId,
          payload: options.payload,
          failureReason,
          attempts,
          organizationId: options.organizationId,
          correlationId,
        },
      });

      webhookLogger.error('Webhook moved to DLQ', {
        correlationId,
        eventId: options.eventId,
        source: options.source,
        attempts,
      });

      return {
        status: 'dead_lettered',
        webhookId: record.id,
        correlationId,
        durationMs: Date.now() - startTime,
      };
    }

    return {
      status: 'failed',
      webhookId: record.id,
      correlationId,
      durationMs: Date.now() - startTime,
    };
  } finally {
    await releaseLock(lockKey);
  }
}

// ============================================================
// RETRY PROCESSOR
// ============================================================

/**
 * Process all webhook events that are due for retry.
 * Called by a cron job or background worker.
 */
export async function processWebhookRetries(
  handlers: Record<string, (payload: Record<string, unknown>) => Promise<void>>
): Promise<{ retried: number; failed: number; deadLettered: number }> {
  const due = await prisma.webhookEvent.findMany({
    where: {
      status: 'failed',
      deadLettered: false,
      nextRetryAt: { lte: new Date() },
    },
    orderBy: { nextRetryAt: 'asc' },
    take: 50,
  });

  let retried = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const event of due) {
    const handler = handlers[`${event.source}:${event.eventType}`] ?? handlers[event.source];
    if (!handler) {
      failed++;
      continue;
    }

    const config = RETRY_CONFIG[event.source as WebhookSource];
    const attempts = event.attempts + 1;

    try {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'processing', attempts: { increment: 1 } },
      });

      await handler(event.payload as Record<string, unknown>);

      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'processed', processedAt: new Date() },
      });

      retried++;
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'Unknown';
      const shouldRetry = attempts < config.maxAttempts;

      if (shouldRetry) {
        const backoffMs = Math.pow(config.backoffBase, attempts) * 1000;
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: 'failed',
            failureReason,
            nextRetryAt: new Date(Date.now() + backoffMs),
          },
        });
        failed++;
      } else {
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: 'dead_lettered',
            failureReason,
            deadLettered: true,
            deadLetteredAt: new Date(),
          },
        });

        await prisma.webhookDeadLetter.upsert({
          where: { webhookEventId: event.id },
          create: {
            webhookEventId: event.id,
            source: event.source,
            eventType: event.eventType,
            eventId: event.eventId,
            payload: event.payload as Record<string, unknown>,
            failureReason,
            attempts,
            organizationId: event.organizationId,
            correlationId: event.correlationId,
          },
          update: { failureReason, attempts },
        });

        deadLettered++;
      }
    }
  }

  return { retried, failed, deadLettered };
}

// ============================================================
// REPLAY SINGLE EVENT
// ============================================================

export async function replayWebhookEvent(
  webhookEventId: string,
  handler: (payload: Record<string, unknown>) => Promise<void>,
  replayedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: webhookEventId },
    include: { deadLetterEntry: true },
  });

  if (!event) return { success: false, error: 'Event not found' };

  try {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

    await handler(event.payload as Record<string, unknown>);

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: 'processed',
        processedAt: new Date(),
        deadLettered: false,
      },
    });

    if (event.deadLetterEntry) {
      await prisma.webhookDeadLetter.update({
        where: { webhookEventId },
        data: { replayedAt: new Date(), replayedBy },
      });
    }

    webhookLogger.info('Webhook replayed successfully', {
      webhookEventId,
      source: event.source,
      eventType: event.eventType,
      replayedBy,
    });

    return { success: true };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : 'Unknown';
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'failed', failureReason },
    });
    return { success: false, error: failureReason };
  }
}

// ============================================================
// WEBHOOK OBSERVABILITY STATS
// ============================================================

export async function getWebhookStats(organizationId?: string): Promise<{
  bySource: Record<string, { processed: number; failed: number; deadLettered: number; pending: number }>;
  dlqCount: number;
  successRate: number;
  avgProcessingMs: number;
}> {
  const where = organizationId ? { organizationId } : {};

  const [byStatus, dlqCount, avgMs] = await Promise.all([
    prisma.webhookEvent.groupBy({
      by: ['source', 'status'],
      where,
      _count: { id: true },
    }),
    prisma.webhookDeadLetter.count({ where: organizationId ? { organizationId } : {} }),
    prisma.webhookEvent.aggregate({
      where: { ...where, status: 'processed', processingMs: { not: null } },
      _avg: { processingMs: true },
    }),
  ]);

  const bySource: Record<string, { processed: number; failed: number; deadLettered: number; pending: number }> = {};

  for (const row of byStatus) {
    if (!bySource[row.source]) {
      bySource[row.source] = { processed: 0, failed: 0, deadLettered: 0, pending: 0 };
    }
    if (row.status === 'processed') bySource[row.source].processed += row._count.id;
    else if (row.status === 'failed') bySource[row.source].failed += row._count.id;
    else if (row.status === 'dead_lettered') bySource[row.source].deadLettered += row._count.id;
    else if (row.status === 'pending' || row.status === 'processing') bySource[row.source].pending += row._count.id;
  }

  const totalProcessed = Object.values(bySource).reduce((s, v) => s + v.processed, 0);
  const totalFailed = Object.values(bySource).reduce((s, v) => s + v.failed + v.deadLettered, 0);
  const successRate = totalProcessed + totalFailed > 0
    ? (totalProcessed / (totalProcessed + totalFailed)) * 100
    : 100;

  return {
    bySource,
    dlqCount,
    successRate: Math.round(successRate * 100) / 100,
    avgProcessingMs: Math.round(avgMs._avg.processingMs ?? 0),
  };
}
