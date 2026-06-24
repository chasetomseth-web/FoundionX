/**
 * Admin: Cache Management
 * POST /api/admin/cache — force invalidation, warm-up, inspect
 */

import { NextRequest, NextResponse } from 'next/server';
import { forceInvalidateTenant, cacheGet, CacheKeys } from '@/lib/redis-lock';
import { apiLogger, getCorrelationId } from '@/lib/observability';

export async function POST(req: NextRequest) {
  const correlationId = getCorrelationId(req);

  try {
    const body = await req.json() as {
      action: 'invalidate' | 'inspect';
      tenantId?: string;
      key?: string;
    };

    if (body.action === 'invalidate') {
      if (!body.tenantId) {
        return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
      }

      const count = await forceInvalidateTenant(body.tenantId);

      apiLogger.info('Admin cache force-invalidated', {
        correlationId,
        tenantId: body.tenantId,
        keysInvalidated: count,
      });

      return NextResponse.json({
        success: true,
        keysInvalidated: count,
        tenantId: body.tenantId,
        correlationId,
      });
    }

    if (body.action === 'inspect') {
      if (!body.tenantId) {
        return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
      }

      // Return current cache state for key caches
      const [orders, analytics, subscriptions, affiliates, kpis] = await Promise.all([
        cacheGet(CacheKeys.orders(body.tenantId)),
        cacheGet(CacheKeys.analytics(body.tenantId)),
        cacheGet(CacheKeys.subscriptions(body.tenantId)),
        cacheGet(CacheKeys.affiliates(body.tenantId)),
        cacheGet(CacheKeys.dashboardKpis(body.tenantId)),
      ]);

      return NextResponse.json({
        tenantId: body.tenantId,
        cacheState: {
          orders: orders !== null ? 'HIT' : 'MISS',
          analytics: analytics !== null ? 'HIT' : 'MISS',
          subscriptions: subscriptions !== null ? 'HIT' : 'MISS',
          affiliates: affiliates !== null ? 'HIT' : 'MISS',
          dashboardKpis: kpis !== null ? 'HIT' : 'MISS',
        },
        correlationId,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    apiLogger.error('Admin cache action failed', { correlationId, error: String(error) });
    return NextResponse.json({ error: 'Cache action failed' }, { status: 500 });
  }
}
