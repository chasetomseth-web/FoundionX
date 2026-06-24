import { NextRequest, NextResponse } from 'next/server';
import { apiMetrics, dbMetrics } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  const windowMs = parseInt(req.nextUrl.searchParams.get('window') ?? '3600000');

  const apiStats = apiMetrics.getStats(windowMs);
  const dbStats = dbMetrics.getStats(windowMs);
  const apiSeries = apiMetrics.getLatencySeries(windowMs);

  // Bucket into 60 time buckets for chart
  const bucketMs = Math.floor(windowMs / 60);
  const now = Date.now();
  const buckets: { time: number; avgMs: number; count: number }[] = [];

  for (let i = 59; i >= 0; i--) {
    const bucketStart = now - (i + 1) * bucketMs;
    const bucketEnd = now - i * bucketMs;
    const pts = apiSeries.filter(p => p.timestamp >= bucketStart && p.timestamp < bucketEnd);
    buckets.push({
      time: bucketEnd,
      avgMs: pts.length > 0 ? Math.round(pts.reduce((s, p) => s + p.value, 0) / pts.length) : 0,
      count: pts.length,
    });
  }

  return NextResponse.json({
    api: { ...apiStats, timeSeries: buckets },
    db: dbStats,
    timestamp: new Date().toISOString(),
    windowMs,
  });
}
