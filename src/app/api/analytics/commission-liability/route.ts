import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

// GET /api/analytics/commission-liability
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const store = await prisma.store.findFirst({
    where: { organizationId: session.organizationId },
  });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  // Totals by status
  const byStatus = await prisma.affiliateCommission.groupBy({
    by: ['status'],
    where: { affiliate: { storeId: store.id } },
    _sum: { amount: true },
    _count: { id: true },
  });

  const get = (status: string) => byStatus.find((b) => b.status === status);

  // Monthly liability trend — last 6 months
  const monthlyTrend = await prisma.$queryRaw<
    Array<{ month: string; pending: string; approved: string; paid: string }>
  >`
    SELECT
      TO_CHAR(DATE_TRUNC('month', ac."createdAt"), 'Mon YY') as month,
      SUM(ac.amount) FILTER (WHERE ac.status = 'pending')::text  as pending,
      SUM(ac.amount) FILTER (WHERE ac.status = 'approved')::text as approved,
      SUM(ac.amount) FILTER (WHERE ac.status = 'paid')::text     as paid
    FROM "AffiliateCommission" ac
    JOIN "Affiliate" a ON a.id = ac."affiliateId"
    WHERE a."storeId" = ${store.id}
      AND ac."createdAt" >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', ac."createdAt")
    ORDER BY DATE_TRUNC('month', ac."createdAt") ASC
  `;

  // Per-affiliate liability: use only fields that exist on the Affiliate model.
  // (Some schemas may not expose a commissions relation or payoutThreshold.)
  const perAffiliate = await prisma.affiliate.findMany({
    where: {
      storeId: store.id,
      status: 'active',
      OR: [{ pendingBalance: { gt: 0 } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      paypalEmail: true,
      pendingBalance: true,
    },
    orderBy: { pendingBalance: 'desc' },
  });

  return NextResponse.json({
    summary: {
      pending: {
        amount: Number((get('pending')?._sum as any)?.amount ?? 0),
        count: get('pending')?._count.id ?? 0,
      },
      approved: {
        amount: Number((get('approved')?._sum as any)?.amount ?? 0),
        count: get('approved')?._count.id ?? 0,
      },
      paid: {
        amount: Number((get('paid')?._sum as any)?.amount ?? 0),
        count: get('paid')?._count.id ?? 0,
      },
      rejected: {
        amount: Number((get('rejected')?._sum as any)?.amount ?? 0),
        count: get('rejected')?._count.id ?? 0,
      },
      totalLiability:
        Number((get('pending')?._sum as any)?.amount ?? 0) +
        Number((get('approved')?._sum as any)?.amount ?? 0),
    },
    perAffiliate: perAffiliate.map((a: any) => {
      const pendingBalance = Number(a.pendingBalance ?? 0);
      const payoutThreshold = 0;

      // Without a commissions relation, we can’t split pending vs approved per affiliate.
      // We treat pendingBalance as the owed amount for the table.
      const pendingCommission = pendingBalance;
      const approvedCommission = 0;
      const totalOwed = pendingCommission + approvedCommission;

      return {
        id: a.id,
        name: a.name,
        paypalEmail: a.paypalEmail ?? null,
        pendingBalance: pendingBalance,
        payoutThreshold,
        pendingCommission,
        approvedCommission,
        totalOwed,
        aboveThreshold: payoutThreshold > 0 ? totalOwed >= payoutThreshold : totalOwed > 0,
        commissionCount: 0,
      };
    }),
    monthlyTrend: monthlyTrend.map((r) => ({
      month: r.month,
      pending: Number(r.pending ?? 0),
      approved: Number(r.approved ?? 0),
      paid: Number(r.paid ?? 0),
    })),
  });
}

