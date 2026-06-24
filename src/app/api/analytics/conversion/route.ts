import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

// GET /api/analytics/conversion?from=&to=
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

  // Default to last 30 days if no date filter
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();

  const byDay = await prisma.$queryRaw<
    Array<{ date: string; sessions: bigint; completed: bigint; rate: string }>
  >`
    SELECT
      DATE("createdAt") as date,
      COUNT(*) as sessions,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      CASE
        WHEN COUNT(*) = 0 THEN '0'
        ELSE ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)) * 100, 2)::text
      END as rate
    FROM "CheckoutSession"
    WHERE "storeId" = ${store.id}
      AND "createdAt" >= ${fromDate}
      AND "createdAt" <= ${toDate}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const data = byDay.map((r) => ({
    date: r.date,
    sessions: Number(r.sessions),
    completed: Number(r.completed),
    rate: Number(r.rate),
  }));

  const avgRate = data.length > 0 ? data.reduce((s, d) => s + d.rate, 0) / data.length : 0;
  const currentRate = data.length > 0 ? data[data.length - 1]?.rate ?? 0 : 0;

  return NextResponse.json({ data, avgRate, currentRate });
}

