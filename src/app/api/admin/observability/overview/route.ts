import { NextRequest, NextResponse } from 'next/server';
import { apiMetrics, dbMetrics, cacheMetrics, queueMetrics, webhookMetrics, computeHealthScore } from '@/lib/metrics';
import { getErrorStats } from '@/lib/error-tracker';
import { getAlertStats } from '@/lib/alerting';
import { evaluateAlertRules } from '@/lib/alerting';

export async function GET(req: NextRequest) {
  // Evaluate alert rules on each overview fetch
  await evaluateAlertRules().catch(() => {});

  const windowMs = parseInt(req.nextUrl.searchParams.get('window') ?? '3600000');

  const health = computeHealthScore();
  const api = apiMetrics.getStats(windowMs);
  const db = dbMetrics.getStats(windowMs);
  const cache = cacheMetrics.getStats(windowMs);
  const queue = queueMetrics.getStats(windowMs);
  const webhook = webhookMetrics.getStats(windowMs);
  const errors = getErrorStats();
  const alerts = getAlertStats();

  return NextResponse.json({
    health,
    timestamp: new Date().toISOString(),
    windowMs,
    metrics: { api, db, cache, queue, webhook },
    errors,
    alerts,
  });
}
