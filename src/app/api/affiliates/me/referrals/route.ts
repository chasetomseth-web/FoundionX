import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/affiliates/me/referrals — affiliate's referred customers
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getCustomerFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const affiliate = await prisma.affiliate.findFirst({
      where: { email: auth.customer.email, storeId: auth.customer.storeId },
    });

    if (!affiliate) return NextResponse.json({ referrals: [] });

    const referrals = await prisma.affiliateReferral.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.nextUrl.searchParams.get('limit') ?? '100'),
    });

    return NextResponse.json({ referrals: referrals.map(r => ({
      id: r.id,
      type: r.type,
      referralUrl: r.referralUrl,
      createdAt: r.createdAt.toISOString(),
      convertedAt: r.convertedAt?.toISOString() ?? null,
    }))});
  } catch {
    return NextResponse.json({ referrals: [] });
  }
}