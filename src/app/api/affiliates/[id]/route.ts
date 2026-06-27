import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export const runtime = 'nodejs';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'affiliates:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const affiliate = await prisma.affiliate.findFirst({
    where: { id, storeId: store.id },
    include: {
      links: true,
      commissions: { orderBy: { createdAt: 'desc' }, take: 20 },
      payouts: { orderBy: { createdAt: 'desc' }, take: 10 },
      referrals: { orderBy: { createdAt: 'desc' }, take: 20 },
      campaigns: true,
    },
  });

  if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
  return NextResponse.json(affiliate);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'affiliates:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const affiliate = await prisma.affiliate.findFirst({ where: { id, storeId: store.id } });
  if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });

  const allowedFields = ['status', 'tier', 'commissionRate', 'recurringCommission', 'recurringRate', 'paypalEmail'];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  const updated = await prisma.affiliate.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
