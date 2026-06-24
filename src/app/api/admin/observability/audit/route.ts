import { NextRequest, NextResponse } from 'next/server';
import { getAuditLog, getAuditStats } from '@/lib/audit-log';
import type { AuditAction } from '@/lib/audit-log';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get('tenantId') ?? undefined;
  const actorId = searchParams.get('actorId') ?? undefined;
  const action = searchParams.get('action') as AuditAction | null;
  const resourceType = searchParams.get('resourceType') ?? undefined;
  const resourceId = searchParams.get('resourceId') ?? undefined;
  const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;
  const limit = parseInt(searchParams.get('limit') ?? '100');

  const entries = getAuditLog({
    tenantId,
    actorId,
    action: action ?? undefined,
    resourceType,
    resourceId,
    since,
    limit,
  });

  const stats = getAuditStats(tenantId);

  return NextResponse.json({ entries, stats, total: entries.length });
}
