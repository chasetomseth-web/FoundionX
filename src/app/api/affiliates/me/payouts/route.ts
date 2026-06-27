import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/affiliates/me/payouts — affiliate's payout history
 * POST /api/affiliates/me/payouts — request a payout
 */
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  try {
    const auth = await getCustomerFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const affiliate = await prisma.affiliate.findFirst({
      where: { email: auth.customer.email, storeId: auth.customer.storeId },
    });

    if (!affiliate) return NextResponse.json({ payouts: [], pendingBalance: 0 });

    const payouts = await prisma.affiliatePayout.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.nextUrl.searchParams.get('limit') ?? '50'),
    });

    return NextResponse.json({
      pendingBalance: Number(affiliate.pendingBalance),
      payouts: payouts.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        reference: p.reference,
        processedAt: p.processedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ payouts: [], pendingBalance: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getCustomerFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const affiliate = await prisma.affiliate.findFirst({
      where: { email: auth.customer.email, storeId: auth.customer.storeId },
    });

    if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    if (Number(affiliate.pendingBalance) <= 0) {
      return NextResponse.json({ error: 'No pending balance to withdraw' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const method = String(body.method ?? 'paypal');

    const payout = await prisma.affiliatePayout.create({
      data: {
        affiliateId: affiliate.id,
        amount: affiliate.pendingBalance,
        method,
        status: 'pending',
      },
    });

    return NextResponse.json({ payout: { id: payout.id, amount: Number(payout.amount), status: payout.status } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to request payout' }, { status: 500 });
  }
}