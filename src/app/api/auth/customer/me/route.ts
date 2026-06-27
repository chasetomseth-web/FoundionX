import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  try {
    const auth = await getCustomerFromRequest(req);

    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const customer = auth.customer;

    // Fetch recent orders
    const recentOrders = await prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    });

    // Fetch subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: { customerId: customer.id },
      select: {
        id: true,
        planName: true,
        status: true,
        amount: true,
        currency: true,
      },
    });

    // Calculate affiliate earnings
    const affiliate = await prisma.affiliate.findFirst({
      where: {
        OR: [
          { email: customer.email },
          { userId: customer.id },
        ],
      },
    });

    const affiliateEarnings = affiliate
      ? Number(affiliate.totalEarned)
      : 0;

    return NextResponse.json({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        totalOrders: customer.totalOrders,
        totalSpent: Number(customer.totalSpent),
        status: customer.status,
      },
      recentOrders: recentOrders.map((o) => ({
        ...o,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
      })),
      subscriptions: subscriptions.map((s) => ({
        ...s,
        amount: Number(s.amount),
      })),
      affiliateEarnings,
    });
  } catch (error) {
    console.error('[CUSTOMER ME] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 });
  }
}