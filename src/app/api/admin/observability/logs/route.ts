import { NextRequest, NextResponse } from 'next/server';
import { getRecentLogs } from '@/lib/logger';
import type { LogLevel, ServiceName } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const level = searchParams.get('level') as LogLevel | null;
  const service = searchParams.get('service') as ServiceName | null;
  const tenantId = searchParams.get('tenantId') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '100');

  const logs = getRecentLogs(limit, {
    level: level ?? undefined,
    service: service ?? undefined,
    tenantId,
  });

  return NextResponse.json({
    logs,
    total: logs.length,
    timestamp: new Date().toISOString(),
  });
}
