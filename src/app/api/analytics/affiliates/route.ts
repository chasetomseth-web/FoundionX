import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

// GET /api/analytics/affiliates?from=2024-01-01&to=2024-01-31
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const store = await prisma.store.findFirst({
    where: { organizationId: session.organizationId },
  });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to)
    dateFilter.lte = new Date(new Date(to).setHours(23, 59, 59, 999));

  const commissionWhere = {
    affiliate: { storeId: store.id },
    ...(from || to ? { createdAt: dateFilter } : {}),
  };

  const clickWhere = {
    affiliate: { storeId: store.id },
    ...(from || to ? { createdAt: dateFilter } : {}),
  };

  // ── 1. Summary totals ──────────────────────────────────────────
  const [
    totalAffiliates,
    activeAffiliates,
    pendingAffiliates,
    totalClicks,
    commissionTotals,
  ] = await Promise.all([
    prisma.affiliate.count({ where: { storeId: store.id } }),
    prisma.affiliate.count({ where: { storeId: store.id, status: 'active' } }),
    prisma.affiliate.count({ where: { storeId: store.id, status: 'pending' } }),
    prisma.affiliateClick.count({ where: clickWhere }),
    prisma.affiliateCommission.groupBy({
      by: ['status'],
      where: commissionWhere,
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const pendingCommission =
    commissionTotals.find((c) => c.status === 'pending')?._sum.amount ?? 0;
  const approvedCommission =
    commissionTotals.find((c) => c.status === 'approved')?._sum.amount ?? 0;
  const paidCommission =
    commissionTotals.find((c) => c.status === 'paid')?._sum.amount ?? 0;
  const totalConversions = commissionTotals.reduce((s, c) => s + c._count.id, 0);
  const totalCommission = commissionTotals.reduce((s, c) => {
    const amt = c._sum.amount;
    return s + Number(typeof amt === 'string' ? Number(amt) : (amt ?? 0));
  }, 0);

  const conversionRate =
    totalClicks > 0 ? (totalConversions / Number(totalClicks)) * 100 : 0;

  // ── 2. Clicks over time (daily) ────────────────────────────────
  const clicksByDay = await prisma.$queryRaw<
    Array<{ date: string; clicks: bigint }>
  >`
    SELECT
      DATE("createdAt") as date,
      COUNT(*) as clicks
    FROM "AffiliateClick"
    WHERE "affiliateId" IN (
      SELECT id FROM "Affiliate" WHERE "storeId" = ${store.id}
    )
    ${from ? prisma.$queryRaw`AND "createdAt" >= ${new Date(from)}` : prisma.$queryRaw``}
    ${to
      ? prisma.$queryRaw`AND "createdAt" <= ${new Date(new Date(to).setHours(23, 59, 59, 999))}`
      : prisma.$queryRaw``}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
    LIMIT 90
  `;

  // ── 3. Commissions over time (daily) ──────────────────────────
  const commissionsByDay = await prisma.$queryRaw<
    Array<{ date: string; amount: string; count: bigint }>
  >`
    SELECT
      DATE(ac."createdAt") as date,
      SUM(ac.amount)::text  as amount,
      COUNT(*)              as count
    FROM "AffiliateCommission" ac
    JOIN "Affiliate" a ON a.id = ac."affiliateId"
    WHERE a."storeId" = ${store.id}
    ${from ? prisma.$queryRaw`AND ac."createdAt" >= ${new Date(from)}` : prisma.$queryRaw``}
    ${to
      ? prisma.$queryRaw`AND ac."createdAt" <= ${new Date(new Date(to).setHours(23, 59, 59, 999))}`
      : prisma.$queryRaw``}
    GROUP BY DATE(ac."createdAt")
    ORDER BY date ASC
    LIMIT 90
  `;

  // ── 4. Top affiliates by revenue attributed ───────────────────
  const topAffiliates = await prisma.affiliate.findMany({
    where: { storeId: store.id, status: 'active' },
    orderBy: { totalEarned: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      clicks: true,
      totalConversions: true,
      totalEarned: true,
      pendingBalance: true,
      commissionRate: true,
    },
  });

  // ── 5. Attribution breakdown — organic vs affiliate ──────────
  const [affiliateOrders, totalOrders] = await Promise.all([
    prisma.order.count({
      where: {
        storeId: store.id,
        affiliateCode: { not: null },
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
    }),
    prisma.order.count({
      where: {
        storeId: store.id,
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
    }),
  ]);

  const [affiliateRevenue, totalRevenue] = await Promise.all([
    prisma.order.aggregate({
      where: {
        storeId: store.id,
        affiliateCode: { not: null },
        status: { in: ['paid', 'fulfilled', 'completed'] },
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        storeId: store.id,
        status: { in: ['paid', 'fulfilled', 'completed'] },
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      _sum: { total: true },
    }),
  ]);

  const affRevenue = Number(affiliateRevenue._sum.total ?? 0);
  const totRevenue = Number(totalRevenue._sum.total ?? 0);
  const affiliatePct = totRevenue > 0 ? (affRevenue / totRevenue) * 100 : 0;

  return NextResponse.json({
    summary: {
      totalAffiliates,
      activeAffiliates,
      pendingAffiliates,
      totalClicks,
      totalConversions,
      totalCommission,
      pendingCommission: Number(pendingCommission),
      approvedCommission: Number(approvedCommission),
      paidCommission: Number(paidCommission),
      conversionRate,
    },
    clicksByDay: clicksByDay.map((r) => ({
      date: r.date,
      clicks: Number(r.clicks),
    })),
    commissionsByDay: commissionsByDay.map((r) => ({
      date: r.date,
      amount: Number(r.amount),
      count: Number(r.count),
    })),

    topAffiliates: topAffiliates.map((a) => ({
      ...a,
      totalEarned: Number(a.totalEarned),
      pendingBalance: Number(a.pendingBalance),
      commissionRate: Number(a.commissionRate),
      conversionRate:
        Number(a.clicks) > 0
          ? (Number(a.totalConversions ?? 0) / Number(a.clicks)) * 100
          : 0,
    })),

    attribution: {
      affiliateOrders,
      organicOrders: totalOrders - affiliateOrders,
      totalOrders,
      affiliateRevenue: affRevenue,
      organicRevenue: totRevenue - affRevenue,
      totalRevenue: totRevenue,
      affiliatePct,
    },
  });
}

