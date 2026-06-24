import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'subscriptions:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);
  const status = searchParams.get('status');
  const search = searchParams.get('search') ?? '';

  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ subscriptions: [], total: 0 });

  // Get customer IDs for this store
  const storeCustomerIds = await prisma.customer.findMany({
    where: { storeId: store.id },
    select: { id: true },
  });
  const customerIds = storeCustomerIds.map((c) => c.id);

  const where: Record<string, unknown> = { customerId: { in: customerIds } };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { stripeSubscriptionId: { contains: search, mode: 'insensitive' } },
      { planName: { contains: search, mode: 'insensitive' } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.subscription.count({ where }),
  ]);

  return NextResponse.json({ subscriptions, total, page, limit, pages: Math.ceil(total / limit) });
}
