import { NextRequest, NextResponse } from 'next/server';
import { queueMetrics } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  const windowMs = parseInt(req.nextUrl.searchParams.get('window') ?? '3600000');
  const stats = queueMetrics.getStats(windowMs);

  return NextResponse.json({
    ...stats,
    timestamp: new Date().toISOString(),
    windowMs,
    healthStatus: stats.currentBacklog < 100 && stats.retryRate < 5 ? 'green' :
                  stats.currentBacklog < 1000 && stats.retryRate < 15 ? 'yellow' : 'red',
  });
}
