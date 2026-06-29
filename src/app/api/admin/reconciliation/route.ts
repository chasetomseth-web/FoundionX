/**
 * Admin: Stripe Reconciliation
 * GET  /api/admin/reconciliation        — history
 * POST /api/admin/reconciliation        — trigger run
 */

import { NextRequest, NextResponse } from 'next/server';
import { runStripeReconciliation, getReconciliationHistory } from '@/lib/stripe-reconciliation';
import { apiLogger, getCorrelationId } from '@/lib/observability';

export async function GET(req: NextRequest) {
  // Avoid breaking production build/startup when admin secrets aren't configured.
  if (!process.env.STRIPE_SECRET_KEY || !process.env.API_KEY) {
    return NextResponse.json({ error: 'Admin reconciliation is disabled' }, { status: 503 });
  }
  const correlationId = getCorrelationId(req);
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  try {
    const history = await getReconciliationHistory(organizationId, limit);
    return NextResponse.json({ history, correlationId });
  } catch (error) {
    apiLogger.error('Reconciliation history failed', { correlationId, error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Avoid breaking production build/startup when admin secrets aren't configured.
  if (!process.env.STRIPE_SECRET_KEY || !process.env.API_KEY) {
    return NextResponse.json({ error: 'Admin reconciliation is disabled' }, { status: 503 });
  }
  const correlationId = getCorrelationId(req);

  try {
    const body = await req.json() as {
      organizationId?: string;
      storeId?: string;
      dryRun?: boolean;
      triggeredBy?: string;
    };

    apiLogger.info('Admin reconciliation triggered', {
      correlationId,
      organizationId: body.organizationId,
      storeId: body.storeId,
      dryRun: body.dryRun,
    });

    const result = await runStripeReconciliation({
      organizationId: body.organizationId,
      storeId: body.storeId,
      dryRun: body.dryRun ?? false,
      triggeredBy: body.triggeredBy ?? 'admin',
    });

    return NextResponse.json({ ...result, correlationId });
  } catch (error) {
    apiLogger.error('Reconciliation run failed', { correlationId, error: String(error) });
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}
