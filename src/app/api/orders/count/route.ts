import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// GET /api/orders/count — returns count of orders, optionally filtered by fulfillmentStatus
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'orders:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const fulfillmentStatus = searchParams.get('fulfillmentStatus');

  const store = await prisma.store.findFirst({
    where: { organizationId: session.organizationId },
  });
  if (!store) return NextResponse.json({ count: 0 });

  const where: Record<string, unknown> = { storeId: store.id };

  if (fulfillmentStatus) {
    const statuses = fulfillmentStatus.split(',');
    if (statuses.length === 1) {
      where.fulfillmentStatus = statuses[0];
    } else {
      where.fulfillmentStatus = { in: statuses };
    }
  }

  const count = await prisma.order.count({ where });

  return NextResponse.json({ count });
}