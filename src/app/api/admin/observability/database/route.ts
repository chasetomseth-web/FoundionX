import { NextRequest, NextResponse } from 'next/server';
import { dbMetrics } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  const windowMs = parseInt(req.nextUrl.searchParams.get('window') ?? '3600000');
  const stats = dbMetrics.getStats(windowMs);

  return NextResponse.json({
    ...stats,
    timestamp: new Date().toISOString(),
    windowMs,
    healthStatus: stats.avgQueryMs < 100 ? 'green' : stats.avgQueryMs < 300 ? 'yellow' : 'red',
    thresholds: { slowQueryMs: 200, criticalMs: 300 },
  });
}
