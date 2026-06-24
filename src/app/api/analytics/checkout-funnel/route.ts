import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

// GET /api/analytics/checkout-funnel?from=&to=
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
  const hasDate = from || to;

  const where = {
    storeId: store.id,
    ...(hasDate ? { createdAt: dateFilter } : {}),
  };

  const [
    totalSessions,
    completedSessions,
    abandonedSessions,
    totalOrders,
    paidOrders,
  ] = await Promise.all([
    prisma.checkoutSession.count({ where }),
    prisma.checkoutSession.count({ where: { ...where, status: 'completed' } }),
    prisma.checkoutSession.count({ where: { ...where, status: 'abandoned' } }),
    prisma.order.count({ where: { storeId: store.id, ...(hasDate ? { createdAt: dateFilter } : {}) } }),
    prisma.order.count({
      where: {
        storeId: store.id,
        status: { in: ['paid', 'fulfilled', 'completed'] },
        ...(hasDate ? { createdAt: dateFilter } : {}),
      },
    }),
  ]);

  // Average order value
  const aovResult = await prisma.order.aggregate({
    where: {
      storeId: store.id,
      status: { in: ['paid', 'fulfilled', 'completed'] },
      ...(hasDate ? { createdAt: dateFilter } : {}),
    },
    _avg: { total: true },
    _sum: { total: true },
  });

  // Sessions by day — to show drop-off trend
  const sessionsByDay = await prisma.$queryRaw<
    Array<{ date: string; total: bigint; completed: bigint }>
  >`
    SELECT
      DATE("createdAt") as date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed
    FROM "CheckoutSession"
    WHERE "storeId" = ${store.id}
    ${from ? prisma.$queryRaw`AND "createdAt" >= ${new Date(from)}` : prisma.$queryRaw``}
    ${to
      ? prisma.$queryRaw`AND "createdAt" <= ${new Date(new Date(to).setHours(23, 59, 59, 999))}`
      : prisma.$queryRaw``}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
    LIMIT 90
  `;

  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  const abandonRate = totalSessions > 0 ? (abandonedSessions / totalSessions) * 100 : 0;

  return NextResponse.json({
    funnel: [
      { stage: 'Sessions Started', count: totalSessions, pct: 100 },
      {
        stage: 'Reached Payment',
        count: completedSessions + abandonedSessions,
        pct: totalSessions > 0 ? ((completedSessions + abandonedSessions) / totalSessions) * 100 : 0,
      },
      {
        stage: 'Payment Completed',
        count: completedSessions,
        pct: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
      },
      {
        stage: 'Order Confirmed',
        count: paidOrders,
        pct: totalSessions > 0 ? (paidOrders / totalSessions) * 100 : 0,
      },
    ],
    summary: {
      totalSessions,
      completedSessions,
      abandonedSessions,
      completionRate,
      abandonRate,
      totalOrders,
      paidOrders,
      aov: Number(aovResult._avg.total ?? 0),
      totalRevenue: Number(aovResult._sum.total ?? 0),
    },
    sessionsByDay: sessionsByDay.map((r) => ({
      date: r.date,
      total: Number(r.total),
      completed: Number(r.completed),
      rate: Number(r.total) > 0 ? (Number(r.completed) / Number(r.total)) * 100 : 0,
    })),
  });
}

