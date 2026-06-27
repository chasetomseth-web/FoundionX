import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/affiliates/me/commissions — affiliate's own commissions list
 */
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  try {
    const auth = await getCustomerFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const affiliate = await prisma.affiliate.findFirst({
      where: { email: auth.customer.email, storeId: auth.customer.storeId },
    });

    if (!affiliate) return NextResponse.json({ commissions: [] });

    const commissions = await prisma.affiliateCommission.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.nextUrl.searchParams.get('limit') ?? '100'),
    });

    return NextResponse.json({ commissions: commissions.map(c => ({
      id: c.id,
      amount: Number(c.amount),
      rate: Number(c.rate),
      orderTotal: Number(c.orderTotal),
      status: c.status,
      type: c.type,
      createdAt: c.createdAt.toISOString(),
    }))});
  } catch {
    return NextResponse.json({ commissions: [] });
  }
}