import { NextRequest, NextResponse } from 'next/server';
import { cacheMetrics } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  const windowMs = parseInt(req.nextUrl.searchParams.get('window') ?? '3600000');
  const stats = cacheMetrics.getStats(windowMs);

  return NextResponse.json({
    ...stats,
    timestamp: new Date().toISOString(),
    windowMs,
    healthStatus: stats.hitRate >= 80 ? 'green' : stats.hitRate >= 60 ? 'yellow' : 'red',
    thresholds: { minHitRate: 80 },
  });
}
