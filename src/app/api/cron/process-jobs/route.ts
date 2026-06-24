/**
 * Cron Job Route — Process Background Jobs
 * Designed to be called by Vercel Cron Jobs or any scheduler
 * Calls processPendingJobs for all queues
 * 
 * Usage: GET /api/cron/process-jobs?queue=email&batchSize=10
 * Or without params to process all queues
 */
import { NextRequest, NextResponse } from 'next/server';
import { processPendingJobs, getQueueStats } from '@/lib/queue';
import { createLogger } from '@/lib/logger';

const logger = createLogger('cron:process-jobs');

export async function GET(request: NextRequest) {
  // Simple auth check — require a cron secret if using externally
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret) {
    if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = request.nextUrl;
  const queue = (searchParams.get('queue') ?? undefined) as any;
  const batchSize = parseInt(searchParams.get('batchSize') ?? '10', 10);

  try {
    const startTime = Date.now();
    
    const result = await processPendingJobs(queue, batchSize);
    
    const durationMs = Date.now() - startTime;

    logger.info('Cron job processed', {
      queue: queue ?? 'all',
      batchSize,
      ...result,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      ...result,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Cron job failed', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}