import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { goaffproService, type GoAffProAffiliate } from '@/lib/goaffpro';
import { getGoAffProAccessToken } from '@/lib/integration-settings';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// Helper: map GoAffPro affiliate to MerchantOS shape
function mapGoAffProAffiliate(a: GoAffProAffiliate) {
  return {
    id: String(a.id),
    name: a.name ?? '',
    email: a.email ?? '',
    referralCode: a.ref_code ?? '',
    status: a.status === 'approved' ? 'active' : (a.status ?? 'pending'),
    tier: a.tier ?? 'standard',
    commissionRate: typeof a.commission_rate === 'number' ? a.commission_rate / 100 : 0,
    recurringCommission: a.recurring_commission ?? false,
    goaffproId: String(a.id),
    paypalEmail: a.paypal_email ?? null,
    totalEarned: a.total_earnings ?? 0,
    pendingBalance: a.pending_balance ?? 0,
    paidOut: a.total_paid ?? 0,
    clicks: a.clicks ?? 0,
    conversions: a.total_conversions ?? 0,
    gmv: 0,
    createdAt: a.created_at ?? new Date().toISOString(),
    _count: { referrals: a.total_referrals ?? 0, commissions: a.total_conversions ?? 0 },
  };
}

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'affiliates:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);
  const search = searchParams.get('search') ?? '';

  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  // Try GoAffPro live data first (global access token); fallback remains tenant-scoped.
  // Note: live data is not currently tenant-filtered at the API level, but we at least enforce auth & tenant isolation for DB fallback.
  const accessToken = await getGoAffProAccessToken();
  const isGoAffProConfigured = !!accessToken;

  if (isGoAffProConfigured) {
    try {
      const { affiliates, total } = await goaffproService.getLiveAffiliates(page, limit, search || undefined);
      const mapped = affiliates.map(mapGoAffProAffiliate);
      return NextResponse.json({
        affiliates: mapped,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        source: 'goaffpro',
      });
    } catch (err) {
      console.error('[AFFILIATES] GoAffPro live fetch failed, falling back to DB:', err);
    }
  }

  // Fallback: DB (STRICTLY tenant-scoped)
  const status = searchParams.get('status');
  const tier = searchParams.get('tier');

  const where: Record<string, unknown> = { storeId: store.id };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { referralCode: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (tier) where.tier = tier;

  try {
    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        include: {
          commissions: { where: { status: 'pending' } },
          _count: { select: { referrals: true, commissions: true } },
        },
        orderBy: { totalEarned: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.affiliate.count({ where }),
    ]);

    return NextResponse.json({ affiliates, total, page, limit, pages: Math.ceil(total / limit), source: 'db' });
  } catch (dbErr) {
    console.error('[AFFILIATES] DB fallback failed:', dbErr);
    return NextResponse.json({ affiliates: [], total: 0, page, limit, pages: 0, source: 'none' });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'affiliates:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();

    const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const referralCode = body.referralCode ?? generateReferralCode(body.name);

    const affiliate = await prisma.affiliate.create({
      data: {
        storeId: store.id,
        email: body.email,
        name: body.name,
        commissionRate: body.commissionRate ?? 0.10,
        recurringCommission: body.recurringCommission ?? false,
        recurringRate: body.recurringRate,
        referralCode,
        tier: body.tier ?? 'standard',
        paypalEmail: body.paypalEmail,
        status: 'pending',
      },
    });

    return NextResponse.json(affiliate, { status: 201 });
  } catch (error) {
    console.error('[AFFILIATES] Create error:', error);
    return NextResponse.json({ error: 'Failed to create affiliate' }, { status: 500 });
  }
}

function generateReferralCode(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}_${suffix}`;
}

