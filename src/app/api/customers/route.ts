import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { getStripeSecretKey } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'customers:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status');
  const tag = searchParams.get('tag');

  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ customers: [], total: 0 });

  const where: Record<string, unknown> = { storeId: store.id };
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { stripeCustomerId: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (tag) where.tags = { has: tag };

  const [localCustomers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        subscriptions: { where: { status: 'active' }, take: 1 },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  let customers = localCustomers as any[];
  if (search) {
    try {
      const stripeKey = await getStripeSecretKey();
      if (stripeKey) {
        const q = encodeURIComponent('email:"' + search + '" OR name:"' + search + '"');
        const res = await fetch('https://api.stripe.com/v1/customers/search?query=' + q + '&limit=10', {
          headers: { Authorization: 'Bearer ' + stripeKey },
        });
        if (res.ok) {
          const stripeData = await res.json();
          const seenEmails = new Set(localCustomers.map((lc: any) => lc.email));
          const seenStripeIds = new Set(localCustomers.map((lc: any) => lc.stripeCustomerId));
          const stripeOnly = (stripeData.data ?? [])
            .filter((c: any) => c.metadata?.deleted !== 'true')
            .filter((c: any) => !seenEmails.has(c.email) && !seenStripeIds.has(c.id))
            .map((c: any) => ({
              id: c.id,
              stripeCustomerId: c.id,
              name: c.name ?? null,
              email: c.email ?? '',
              phone: c.phone ?? null,
              createdAt: new Date(c.created * 1000),
              tags: [],
              _stripeOnly: true,
            }));
          customers = [...localCustomers, ...stripeOnly];
        }
      }
    } catch {}
  }

  return NextResponse.json({ customers, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'customers:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const existing = await prisma.customer.findUnique({
      where: { storeId_email: { storeId: store.id, email: body.email } },
    });
    if (existing) return NextResponse.json({ error: 'Customer already exists' }, { status: 409 });

    // Create customer in Stripe first
    const stripeKey = await getStripeSecretKey();
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 });
    }

    const stripeBody = new URLSearchParams();
    stripeBody.set('email', body.email);
    if (body.firstName || body.lastName) {
      stripeBody.set('name', `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim());
    }
    if (body.phone) stripeBody.set('phone', body.phone);
    if (body.line1) {
      stripeBody.set('address[line1]', body.line1);
      if (body.city) stripeBody.set('address[city]', body.city);
      if (body.state) stripeBody.set('address[state]', body.state);
      if (body.postal_code) stripeBody.set('address[postal_code]', body.postal_code);
      if (body.country) stripeBody.set('address[country]', body.country);
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeBody.toString(),
    });

    const stripeCustomer = await stripeRes.json();
    if (!stripeRes.ok) {
      throw new Error(stripeCustomer.error?.message ?? 'Failed to create Stripe customer');
    }

    // Save to local DB with the Stripe customer ID
    const customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        email: body.email,
        name: body.name ? `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim() : undefined,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        country: body.country,
        tags: body.tags ?? [],
        notes: body.notes,
        acceptsMarketing: body.acceptsMarketing ?? false,
        stripeCustomerId: stripeCustomer.id,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('[CUSTOMERS] Create error:', error instanceof Error ? error.message : JSON.stringify(error), error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
