import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

/**
 * GET /api/search
 * Full-text search across orders, customers, products, subscriptions, affiliates
 */
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim() ?? '';
  const scope = searchParams.get('scope'); // optional: 'orders' | 'customers' | 'products' | 'subscriptions' | 'affiliates'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5'), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: {} });
  }

  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ results: {} });

  const searchMode = 'insensitive' as const;
  const results: Record<string, unknown[]> = {};

  const shouldSearch = (s: string) => !scope || scope === s;

  await Promise.all([
    // Orders
    shouldSearch('orders') &&
      prisma.order
        .findMany({
          where: {
            storeId: store.id,
            OR: [
              { orderNumber: { contains: q, mode: searchMode } },
              { customer: { name: { contains: q, mode: searchMode } } },
              { customer: { email: { contains: q, mode: searchMode } } },
              { stripePaymentIntentId: { contains: q, mode: searchMode } },
            ],
          },
          include: { customer: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        .then((data) => {
          results.orders = data.map((o) => ({
            id: o.id,
            type: 'order',
            title: o.orderNumber,
            subtitle: o.customer?.name ?? o.customer?.email ?? '',
            meta: `$${Number(o.total).toFixed(2)} · ${o.paymentStatus}`,
            url: '/orders-dashboard',
          }));
        }),

    // Customers
    shouldSearch('customers') &&
      prisma.customer
        .findMany({
          where: {
            storeId: store.id,
            OR: [
              { name: { contains: q, mode: searchMode } },
              { email: { contains: q, mode: searchMode } },
              { phone: { contains: q, mode: searchMode } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        .then((data) => {
          results.customers = data.map((c) => ({
            id: c.id,
            type: 'customer',
            title: c.name ?? c.email,
            subtitle: c.email,
            meta: c.status,
            url: '/customers',
          }));
        }),

    // Products
    shouldSearch('products') &&
      prisma.product
        .findMany({
          where: {
            storeId: store.id,
            OR: [
              { name: { contains: q, mode: searchMode } },
              { sku: { contains: q, mode: searchMode } },
              { description: { contains: q, mode: searchMode } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        .then((data) => {
          results.products = data.map((p) => ({
            id: p.id,
            type: 'product',
            title: p.name,
            subtitle: p.sku ?? '',
            meta: `$${Number(p.price).toFixed(2)} · ${p.status}`,
            url: '/products',
          }));
        }),

    // Affiliates
    shouldSearch('affiliates') &&
      prisma.affiliate
        .findMany({
          where: {
            storeId: store.id,
            OR: [
              { name: { contains: q, mode: searchMode } },
              { email: { contains: q, mode: searchMode } },
              { referralCode: { contains: q, mode: searchMode } },
            ],
          },
          take: limit,
        })
        .then((data) => {
          results.affiliates = data.map((a) => ({
            id: a.id,
            type: 'affiliate',
            title: a.name,
            subtitle: a.referralCode,
            meta: a.status,
            url: '/affiliates',
          }));
        }),
  ]);

  // Flatten for global search
  const allResults = Object.values(results).flat();

  return NextResponse.json({ results, allResults, query: q });
}
