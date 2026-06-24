import { NextRequest, NextResponse } from 'next/server';
import { webhookMetrics } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  const windowMs = parseInt(req.nextUrl.searchParams.get('window') ?? '3600000');
  const stats = webhookMetrics.getStats(windowMs);

  return NextResponse.json({
    ...stats,
    timestamp: new Date().toISOString(),
    windowMs,
    healthStatus: stats.successRate >= 95 ? 'green' : stats.successRate >= 90 ? 'yellow' : 'red',
  });
}
