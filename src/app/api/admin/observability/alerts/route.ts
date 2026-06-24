import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, acknowledgeAlert, evaluateAlertRules, getAlertStats } from '@/lib/alerting';
import type { AlertSeverity } from '@/lib/alerting';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const severity = searchParams.get('severity') as AlertSeverity | null;
  const acknowledged = searchParams.has('acknowledged') ? searchParams.get('acknowledged') === 'true' : undefined;
  const limit = parseInt(searchParams.get('limit') ?? '50');

  const alerts = getAlerts({ severity: severity ?? undefined, acknowledged, limit });
  const stats = getAlertStats();

  return NextResponse.json({ alerts, stats, total: alerts.length });
}

export async function POST(req: NextRequest) {
  const { action, id } = await req.json();

  if (action === 'evaluate') {
    await evaluateAlertRules();
    return NextResponse.json({ evaluated: true, timestamp: new Date().toISOString() });
  }

  if (action === 'acknowledge' && id) {
    const ok = acknowledgeAlert(id);
    return NextResponse.json({ acknowledged: ok });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
