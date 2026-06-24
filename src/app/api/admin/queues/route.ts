/**
 * Admin: Queue Management
 * GET  /api/admin/queues          — stats + DLQ viewer
 * POST /api/admin/queues          — replay job, process batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueueStats, getDeadLetterJobs, replayJob, processPendingJobs } from '@/lib/queue';
import { apiLogger, getCorrelationId } from '@/lib/observability';

export async function GET(req: NextRequest) {
  const correlationId = getCorrelationId(req);
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view');

  try {
    if (view === 'dlq') {
      const queue = searchParams.get('queue') as Parameters<typeof getDeadLetterJobs>[0];
      const limit = parseInt(searchParams.get('limit') ?? '50', 10);
      const jobs = await getDeadLetterJobs(queue, limit);
      return NextResponse.json({ jobs, correlationId });
    }

    const stats = await getQueueStats();
    return NextResponse.json({ stats, correlationId });
  } catch (error) {
    apiLogger.error('Queue stats failed', { correlationId, error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch queue stats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const correlationId = getCorrelationId(req);

  try {
    const body = await req.json() as {
      action: 'replay' | 'process';
      jobId?: string;
      queue?: string;
      batchSize?: number;
    };

    if (body.action === 'replay') {
      if (!body.jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
      const result = await replayJob(body.jobId);
      apiLogger.info('Admin job replay', { correlationId, jobId: body.jobId, success: result.success });
      return NextResponse.json({ ...result, correlationId });
    }

    if (body.action === 'process') {
      const result = await processPendingJobs(
        body.queue as Parameters<typeof processPendingJobs>[0],
        body.batchSize ?? 10
      );
      apiLogger.info('Admin queue process', { correlationId, ...result });
      return NextResponse.json({ ...result, correlationId });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    apiLogger.error('Queue action failed', { correlationId, error: String(error) });
    return NextResponse.json({ error: 'Queue action failed' }, { status: 500 });
  }
}
