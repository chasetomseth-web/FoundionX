import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// GET /api/orders/[orderId]
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'orders:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orderId } = await params;
  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    include: {
      customer: true,
      items: { include: { product: true } },
      fulfillments: true,
      shipments: true,
      refunds: true,
      transactions: true,
      taxRecords: true,
    },
  });

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  return NextResponse.json(order);
}

// PATCH /api/orders/[orderId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'orders:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orderId } = await params;
  const body = await req.json();
  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const order = await prisma.order.findFirst({ where: { id: orderId, storeId: store.id } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const allowedFields = ['fulfillmentStatus', 'status', 'notes', 'metadata'];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: { customer: true, items: true, shipments: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: session.organizationId,
      userId: session.userId,
      action: 'order.updated',
      resource: 'order',
      resourceId: orderId,
      metadata: updateData,
    },
  });

  return NextResponse.json(updated);
}
