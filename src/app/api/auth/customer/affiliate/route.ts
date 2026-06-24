import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, EmailType } from '@/lib/email/emailRouter';
import { systemLog } from '@/lib/logger';

/**
 * GET /api/auth/customer/affiliate
 * Fetch affiliate data for the logged-in customer.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getCustomerFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const customer = auth.customer;

    // Look up affiliate record
    const affiliate = await prisma.affiliate.findFirst({
      where: {
        OR: [
          { email: customer.email },
          { userId: customer.id },
        ],
        storeId: customer.storeId,
      },
      include: {
        commissions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        clicks: {
          take: 0, // just count
        },
        links: {
          take: 5,
        },
      },
    });

    if (!affiliate) {
      return NextResponse.json({
        isAffiliate: false,
        totalEarned: 0,
        totalPaid: 0,
        pendingBalance: 0,
        totalConversions: 0,
        totalClicks: 0,
        commissions: [],
      });
    }

    const totalClicks = await prisma.affiliateClick.count({
      where: { affiliateId: affiliate.id },
    });

    const storeUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://merchantos.com';
    const defaultLink = affiliate.links[0];

    return NextResponse.json({
      isAffiliate: true,
      id: affiliate.id,
      referralCode: affiliate.referralCode,
      referralUrl: defaultLink?.url ?? `${storeUrl}/?ref=${affiliate.referralCode}`,
      commissionRate: Number(affiliate.commissionRate),
      totalEarned: Number(affiliate.totalEarned),
      totalPaid: Number(affiliate.totalPaid),
      pendingBalance: Number(affiliate.pendingBalance),
      totalConversions: affiliate.totalConversions,
      totalClicks,
      commissions: affiliate.commissions.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        rate: Number(c.rate),
        orderTotal: Number(c.orderTotal),
        status: c.status,
        type: c.type,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    systemLog.error('[CUSTOMER AFFILIATE GET] Error', {
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: 'Failed to fetch affiliate data' }, { status: 500 });
  }
}

/**
 * POST /api/auth/customer/affiliate
 * Create an affiliate account for the logged-in customer ("Become an Affiliate" flow).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getCustomerFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const customer = auth.customer;

    // Check if already an affiliate
    const existing = await prisma.affiliate.findFirst({
      where: {
        OR: [
          { email: customer.email },
          { userId: customer.id },
        ],
        storeId: customer.storeId,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'You are already an affiliate' }, { status: 409 });
    }

    // Generate referral code from name
    const nameBase = customer.name ?? customer.email.split('@')[0];
    const baseCode = nameBase.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    const randomSuffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    const referralCode = `${baseCode}${randomSuffix}`.slice(0, 12);

    const storeUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://merchantos.com';

    // Create affiliate
    const affiliate = await prisma.affiliate.create({
      data: {
        storeId: customer.storeId,
        userId: customer.id,
        email: customer.email,
        name: customer.name ?? customer.email,
        referralCode,
        status: 'active', // auto-approve
        commissionRate: 0.10, // 10% default
        totalEarned: 0,
        totalPaid: 0,
        pendingBalance: 0,
        totalReferrals: 0,
        totalConversions: 0,
      },
    });

    // Create default affiliate link
    const defaultUrl = `${storeUrl}/?ref=${referralCode}`;
    await prisma.affiliateLink.create({
      data: {
        affiliateId: affiliate.id,
        url: defaultUrl,
        slug: referralCode.toLowerCase(),
        label: 'Default Storefront Link',
        isActive: true,
      },
    });

    // Send affiliate welcome email
    try {
      await sendEmail({
        type: EmailType.AFFILIATE_WELCOME,
        data: {
          email: customer.email,
          name: customer.name ?? customer.email,
          referralCode,
          referralUrl: defaultUrl,
          commissionRate: 0.10,
        },
      });
    } catch (err) {
      systemLog.error('[CUSTOMER AFFILIATE] Welcome email failed', {
        error: { message: err instanceof Error ? err.message : String(err) },
      });
    }

    return NextResponse.json({
      isAffiliate: true,
      id: affiliate.id,
      referralCode,
      referralUrl: defaultUrl,
      commissionRate: 0.10,
      totalEarned: 0,
      totalPaid: 0,
      pendingBalance: 0,
      totalConversions: 0,
      totalClicks: 0,
      commissions: [],
    }, { status: 201 });
  } catch (error) {
    systemLog.error('[CUSTOMER AFFILIATE POST] Error', {
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: 'Failed to create affiliate account' }, { status: 500 });
  }
}