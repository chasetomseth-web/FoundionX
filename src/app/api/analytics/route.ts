import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

/**
 * Enhanced analytics API with Redis-compatible caching via in-memory fallback
 * Supports type-specific queries for targeted KPI fetching
 */

// Simple in-memory cache (replace with Redis in production)
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'analytics:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type'); // optional: 'orders' | 'customers' | 'products' | 'subscriptions' | 'affiliates'
  const dateFrom = searchParams.get('dateFrom')
    ? new Date(searchParams.get('dateFrom')!)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = searchParams.get('dateTo')
    ? new Date(searchParams.get('dateTo')!)
    : new Date();

  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const cacheKey = `analytics:${store.id}:${type ?? 'all'}:${dateFrom.toISOString()}:${dateTo.toISOString()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=60' },
    });
  }

  const dateFilter = { gte: dateFrom, lte: dateTo };

  try {
    const [
      orderStats,
      revenueByDay,
      topProducts,
      customerStats,
      subscriptionStats,
      affiliateStats,
      recentOrders,
      failedPayments,
      pendingFulfillment,
      atRiskCustomers,
      activeCustomers,
      lowStockProducts,
      activeProducts,
      draftProducts,
      pastDueSubscriptions,
      totalSubscriptions,
    ] = await Promise.all([
      // Order KPIs
      prisma.order.aggregate({
        where: { storeId: store.id, createdAt: dateFilter },
        _count: { id: true },
        _sum: { total: true, refundedAmount: true },
        _avg: { total: true },
      }),

      // Revenue by day
      prisma.$queryRaw<{ date: string; revenue: number; orders: number }[]>`
        SELECT
          DATE("createdAt")::text as date,
          COALESCE(SUM(total), 0)::float as revenue,
          COUNT(id)::int as orders
        FROM "Order"
        WHERE "storeId" = ${store.id}
          AND "createdAt" >= ${dateFrom}
          AND "createdAt" <= ${dateTo}
          AND "paymentStatus" = 'paid'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,

      // Top products by revenue
      prisma.orderItem.groupBy({
        by: ['productId', 'name'],
        where: {
          order: {
            storeId: store.id,
            createdAt: dateFilter,
            paymentStatus: 'paid',
          },
        },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 7,
      }),

      // Customer stats
      prisma.customer.aggregate({
        where: { storeId: store.id },
        _count: { id: true },
        _sum: { totalSpent: true },
        _avg: { avgOrderValue: true },
      }),

      // Subscription stats by status
      prisma.subscription.groupBy({
        by: ['status'],
        where: { customer: { storeId: store.id } },
        _count: { id: true },
        _sum: { amount: true },
      }),

      // Affiliate stats
      prisma.affiliate.aggregate({
        where: { storeId: store.id, status: 'active' },
        _count: { id: true },
        _sum: { totalEarned: true, pendingBalance: true },
      }),

      // Recent orders
      prisma.order.findMany({
        where: { storeId: store.id },
        include: {
          customer: { select: { name: true, email: true } },
          items: { take: 1, select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Failed payments count
      prisma.order.count({
        where: { storeId: store.id, paymentStatus: 'failed', createdAt: dateFilter },
      }),

      // Pending fulfillment
      prisma.order.count({
        where: { storeId: store.id, fulfillmentStatus: 'unfulfilled', paymentStatus: 'paid' },
      }),

      // At risk customers
      prisma.customer.count({
        where: { storeId: store.id, status: 'at_risk' },
      }),

      // Active customers
      prisma.customer.count({
        where: { storeId: store.id, status: 'active' },
      }),

      // Low stock products
      prisma.inventory.count({
        where: {
          product: { storeId: store.id, type: 'physical', status: 'active' },
          quantity: { lt: 50 },
        },
      }),

      // Active products
      prisma.product.count({
        where: { storeId: store.id, status: 'active' },
      }),

      // Draft products
      prisma.product.count({
        where: { storeId: store.id, status: 'draft' },
      }),

      // Past due subscriptions
      prisma.subscription.count({
        where: { customer: { storeId: store.id }, status: 'past_due' },
      }),

      // Total subscriptions
      prisma.subscription.count({
        where: { customer: { storeId: store.id } },
      }),
    ]);

    // Calculate MRR from active monthly subscriptions
    const activeMonthlyStats = subscriptionStats.find((s) => s.status === 'active');
    const mrr = Number(activeMonthlyStats?._sum?.amount ?? 0);

    // Total affiliate GMV (from commissions)
    const affiliateGMV = await prisma.affiliateCommission.aggregate({
      where: { affiliate: { storeId: store.id } },
      _sum: { orderAmount: true },
    });

    const totalAffiliates = await prisma.affiliate.count({
      where: { storeId: store.id },
    });

    const result = {
      kpis: {
        totalRevenue: Number(orderStats._sum.total ?? 0),
        totalOrders: orderStats._count.id,
        avgOrderValue: Number(orderStats._avg.total ?? 0),
        totalRefunded: Number(orderStats._sum.refundedAmount ?? 0),
        totalCustomers: customerStats._count.id,
        mrr,
        arr: mrr * 12,
        activeSubscriptions: activeMonthlyStats?._count.id ?? 0,
        failedPayments,
        pendingFulfillment,
        activeAffiliates: affiliateStats._count.id,
        totalAffiliates,
        totalCommissions: Number(affiliateStats._sum.totalEarned ?? 0),
        pendingCommissions: Number(affiliateStats._sum.pendingBalance ?? 0),
        affiliateGMV: Number(affiliateGMV._sum.orderAmount ?? 0),
        atRiskCustomers,
        activeCustomers,
        lowStockProducts,
        activeProducts,
        draftProducts,
        pastDueSubscriptions,
        totalSubscriptions,
      },
      revenueByDay,
      topProducts,
      subscriptionBreakdown: subscriptionStats,
      recentOrders,
    };

    // Cache for 60 seconds
    setCached(cacheKey, result, 60 * 1000);

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
    return NextResponse.json({ error: 'Analytics query failed' }, { status: 500 });
  }
}
