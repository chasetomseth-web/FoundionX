/**
 * MerchantOS — Analytics Pre-Aggregation Job
 * Refreshes materialized views and populates Redis KPI snapshots.
 * Triggered via BullMQ analytics queue (low priority).
 */

import { prisma } from './prisma';
import { cacheSet, CacheKeys } from './redis-lock';

import { queueLogger } from './observability';

// ============================================================
// MATERIALIZED VIEW REFRESH
// ============================================================

/**
 * Refresh all analytics materialized views via Postgres function.
 * Runs CONCURRENTLY — does not block reads.
 */
export async function refreshMaterializedViews(): Promise<{
  success: boolean;
  durationMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$executeRaw`SELECT refresh_analytics_views()`;
    const durationMs = Date.now() - start;
    queueLogger.info('Materialized views refreshed', { durationMs });
    return { success: true, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    queueLogger.error('Materialized view refresh failed', { error, durationMs });
    return { success: false, durationMs, error };
  }
}

// ============================================================
// KPI SNAPSHOT PRE-AGGREGATION
// ============================================================

/**
 * Pre-aggregate KPI snapshots for all active stores.
 * Populates Redis cache so dashboards never hit raw DB.
 */
export async function preAggregateAllTenantKPIs(): Promise<{
  tenantsProcessed: number;
  errors: number;
  durationMs: number;
}> {
  const start = Date.now();
  let tenantsProcessed = 0;
  let errors = 0;

  try {
    // Get all active stores
    const stores = await prisma.store.findMany({
      where: { status: 'active' },
      select: { id: true, organizationId: true },
    });

    queueLogger.info('Starting KPI pre-aggregation', { storeCount: stores.length });

    // Process in batches of 10 to avoid overwhelming DB
    const batchSize = 10;
    for (let i = 0; i < stores.length; i += batchSize) {
      const batch = stores.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (store) => {
          try {
            // Force-refresh KPI (bypasses cache, writes new value)
            const kpi = await buildKPISnapshot(store.id);
            await cacheSet(CacheKeys.dashboardKpis(store.id), kpi, 120);
            tenantsProcessed++;
          } catch (err) {
            errors++;
            queueLogger.error('KPI pre-aggregation failed for store', {
              storeId: store.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })
      );
    }
  } catch (err) {
    queueLogger.error('KPI pre-aggregation job failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const durationMs = Date.now() - start;
  queueLogger.info('KPI pre-aggregation complete', { tenantsProcessed, errors, durationMs });

  return { tenantsProcessed, errors, durationMs };
}

// ============================================================
// ROLLING TIME-WINDOW CALCULATIONS
// ============================================================

export interface RollingWindowMetrics {
  storeId: string;
  window: '1h' | '24h' | '7d' | '30d';
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  newCustomers: number;
  calculatedAt: string;
}

export async function calculateRollingWindow(
  storeId: string,
  window: '1h' | '24h' | '7d' | '30d'
): Promise<RollingWindowMetrics> {
  const windowMs: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const since = new Date(Date.now() - windowMs[window]);

  const [revenueAgg, newCustomers] = await Promise.all([
    prisma.order.aggregate({
      where: { storeId, paymentStatus: 'paid', createdAt: { gte: since } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.customer.count({ where: { storeId, createdAt: { gte: since } } }),
  ]);

  const orderCount = revenueAgg._count;
  const revenue = Number(revenueAgg._sum.total ?? 0);

  return {
    storeId,
    window,
    revenue,
    orderCount,
    avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
    newCustomers,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Cache rolling window metrics for a tenant.
 */
export async function cacheRollingWindowMetrics(storeId: string): Promise<void> {
  const windows: Array<'1h' | '24h' | '7d' | '30d'> = ['1h', '24h', '7d', '30d'];

  await Promise.allSettled(
    windows.map(async (window) => {
      const metrics = await calculateRollingWindow(storeId, window);
      const cacheKey = `tenant:${storeId}:rolling:${window}`;
      const ttl = window === '1h' ? 60 : window === '24h' ? 300 : 600;
      await cacheSet(cacheKey, metrics, ttl);
    })
  );
}

// ============================================================
// INTERNAL KPI BUILDER (raw DB, no cache)
// ============================================================

async function buildKPISnapshot(storeId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [revenueToday, revenue30d, ordersToday, orders30d, customerCount, newCustomers30d] =
    await Promise.all([
      prisma.order.aggregate({
        where: { storeId, paymentStatus: 'paid', createdAt: { gte: todayStart } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { storeId, paymentStatus: 'paid', createdAt: { gte: last30d } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.count({ where: { storeId, createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { storeId, createdAt: { gte: last30d } } }),
      prisma.customer.count({ where: { storeId } }),
      prisma.customer.count({ where: { storeId, createdAt: { gte: last30d } } }),
    ]);

  const totalRevenue30d = Number(revenue30d._sum.total ?? 0);
  const totalOrders30d = revenue30d._count;

  return {
    revenue: {
      today: Number(revenueToday._sum.total ?? 0),
      last30d: totalRevenue30d,
    },
    orders: {
      today: ordersToday,
      last30d: orders30d,
    },
    customers: {
      total: customerCount,
      new30d: newCustomers30d,
    },
    avgOrderValue: totalOrders30d > 0 ? totalRevenue30d / totalOrders30d : 0,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================
// MRR SNAPSHOT (from materialized view or raw)
// ============================================================

export async function getMRRSnapshot(storeId: string): Promise<{
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  pastDueCount: number;
  cachedAt: string;
}> {
  const cacheKey = CacheKeys.mrrMetrics(storeId);

  // Try materialized view first
  try {
    const mvResult = await prisma.$queryRaw<
      Array<{ mrr: number; arr: number; active_subscriptions: number; past_due_count: number }>
    >`
      SELECT mrr, arr, active_subscriptions, past_due_count
      FROM mv_mrr
      WHERE tenant_id = ${storeId}
      LIMIT 1
    `;

    if (mvResult.length > 0) {
      const snapshot = {
        mrr: Number(mvResult[0].mrr ?? 0),
        arr: Number(mvResult[0].arr ?? 0),
        activeSubscriptions: Number(mvResult[0].active_subscriptions ?? 0),
        pastDueCount: Number(mvResult[0].past_due_count ?? 0),
        cachedAt: new Date().toISOString(),
      };
      await cacheSet(cacheKey, snapshot, 300);
      return snapshot;
    }
  } catch {
    // Materialized view not available, fall back to raw query
  }

  // Fallback: raw aggregation
  const subs = await prisma.subscription.findMany({
    where: { storeId, status: { in: ['active', 'past_due'] } },
    select: { status: true, amount: true, interval: true },
  });

  let mrr = 0;
  let activeSubscriptions = 0;
  let pastDueCount = 0;

  for (const sub of subs) {
    const amount = Number(sub.amount);
    let monthlyAmount = amount;
    if (sub.interval === 'year') monthlyAmount = amount / 12;
    if (sub.interval === 'week') monthlyAmount = amount * 4.33;

    if (sub.status === 'active') {
      mrr += monthlyAmount;
      activeSubscriptions++;
    } else if (sub.status === 'past_due') {
      pastDueCount++;
    }
  }

  const snapshot = {
    mrr,
    arr: mrr * 12,
    activeSubscriptions,
    pastDueCount,
    cachedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, snapshot, 300);
  return snapshot;
}
