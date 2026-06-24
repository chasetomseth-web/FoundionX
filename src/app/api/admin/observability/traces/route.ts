import { NextRequest, NextResponse } from 'next/server';
import { getTrace, getRecentTraces } from '@/lib/tracing';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const traceId = searchParams.get('traceId');
  const tenantId = searchParams.get('tenantId') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '50');

  if (traceId) {
    const trace = getTrace(traceId);
    if (!trace) return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
    return NextResponse.json({ trace });
  }

  const traces = getRecentTraces(limit, tenantId);
  return NextResponse.json({
    traces,
    total: traces.length,
    timestamp: new Date().toISOString(),
  });
}
