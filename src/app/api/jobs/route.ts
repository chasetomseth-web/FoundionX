import { NextRequest, NextResponse } from 'next/server';

import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { processPendingJobs, getQueueStats } from '@/lib/queue';

// GET /api/jobs — queue stats
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const stats = await getQueueStats();
  return NextResponse.json({ stats });
}

// POST /api/jobs — trigger queue processing (called by cron or manually)
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const queue = searchParams.get('queue') as string | undefined;
  const batch = parseInt(searchParams.get('batch') ?? '10');

  const result = await processPendingJobs(queue as Parameters<typeof processPendingJobs>[0], batch);

  return NextResponse.json(result);
}
