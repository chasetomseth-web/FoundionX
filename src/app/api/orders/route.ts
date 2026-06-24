import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// GET /api/orders — list orders with filtering, pagination, search
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'orders:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);
  const search = searchParams.get('search') ?? '';
  const paymentStatus = searchParams.get('paymentStatus');
  const fulfillmentStatus = searchParams.get('fulfillmentStatus');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const affiliateId = searchParams.get('affiliateId');

  // Get store for this organization
  const store = await prisma.store.findFirst({
    where: { organizationId: session.organizationId },
  });
  if (!store) return NextResponse.json({ orders: [], total: 0 });

  const where: Record<string, unknown> = { storeId: store.id };

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { stripePaymentIntentId: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (fulfillmentStatus) where.fulfillmentStatus = fulfillmentStatus;
  if (affiliateId) where.affiliateId = affiliateId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
        shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
        refunds: { where: { status: 'processed' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}

// POST /api/orders — create manual order
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'orders:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const store = await prisma.store.findFirst({
      where: { organizationId: session.organizationId },
    });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // Generate order number
    const count = await prisma.order.count({ where: { storeId: store.id } });
    const orderNumber = `#${String(count + 1001).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        orderNumber,
        customerId: body.customerId,
        status: 'pending',
        paymentStatus: body.paymentStatus ?? 'pending',
        fulfillmentStatus: 'unfulfilled',
        currency: body.currency ?? 'USD',
        subtotal: body.subtotal,
        discountTotal: body.discountTotal ?? 0,
        shippingTotal: body.shippingTotal ?? 0,
        taxTotal: body.taxTotal ?? 0,
        total: body.total,
        notes: body.notes,
        metadata: body.metadata,
        items: {
          create: body.items?.map((item: { productId?: string; name: string; sku?: string; quantity: number; price: number; total: number }) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })) ?? [],
        },
      },
      include: { items: true, customer: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        action: 'order.created',
        resource: 'order',
        resourceId: order.id,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[ORDERS] Create error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
