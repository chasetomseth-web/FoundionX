import { NextRequest, NextResponse } from 'next/server';
import { getStripeSecretKey } from '@/lib/stripe';
import Stripe from 'stripe';

const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeRequest<T>(path: string, stripeKey: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? `Stripe error ${res.status}`);
  }
  return res.json();
}

function buildQuery(params: Record<string, string | number | string[] | undefined>) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    .flatMap(([k, v]) => {
      if (Array.isArray(v)) {
        return v.map((item) => `${encodeURIComponent(k)}[]=${encodeURIComponent(String(item))}`);
      }
      return `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
    })
    .join('&');
}

// GET /api/customers/stripe-sync — fetch customers directly from Stripe
export async function GET(req: NextRequest) {
  const stripeKey = await getStripeSecretKey();
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe is not configured. Add your STRIPE_SECRET_KEY in Settings → Integrations.' }, { status: 400 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);
  const startingAfter = searchParams.get('starting_after') ?? undefined;
  const search = searchParams.get('search') ?? '';

  try {
    let customers: StripeCustomer[] = [];
    let hasMore = false;
    let lastId: string | undefined;

    if (search) {
      // Use Stripe search API
      const query = `email:"${search}" OR name:"${search}"`;
      const qs = buildQuery({ query, limit });
      const result = await stripeRequest<{ data: StripeCustomer[]; has_more: boolean }>(`/customers/search?${qs}`, stripeKey);
      customers = result.data ?? [];
      hasMore = result.has_more ?? false;
    } else {
      const qs = buildQuery({ limit, starting_after: startingAfter, expand: ['data.subscriptions'] });
      const result = await stripeRequest<{ data: StripeCustomer[]; has_more: boolean }>(`/customers?${qs}`, stripeKey);
      customers = result.data ?? [];
      hasMore = result.has_more ?? false;
    }

    // Filter out soft-deleted customers
    customers = customers.filter(c => c.metadata?.deleted !== "true");

    if (customers.length > 0) {
      lastId = customers[customers.length - 1].id;
    }

    // Enrich with payment methods and charges for each customer (batch)
    const enriched = await Promise.all(
      customers.map(async (c) => {
        try {
          const [pmResult, chargesResult] = await Promise.all([
            stripeRequest<{ data: StripePaymentMethod[] }>(`/payment_methods?${buildQuery({ customer: c.id, type: 'card', limit: 5 })}`, stripeKey),
            stripeRequest<{ data: StripeCharge[] }>(`/charges?${buildQuery({ customer: c.id, limit: 10 })}`, stripeKey),
          ]);
          return { ...c, paymentMethods: pmResult.data ?? [], charges: chargesResult.data ?? [] };
        } catch {
          return { ...c, paymentMethods: [], charges: [] };
        }
      })
    );

    // Upsert Stripe customers into local DB so they're searchable everywhere
    try {
      const { prisma } = await import('@/lib/prisma');
      const { getAuthFromRequest } = await import('@/lib/auth');
      const session = await getAuthFromRequest(req);
      if (session) {
        const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
        if (store) {
          await Promise.all(
            enriched.map((c) =>
              prisma.customer.upsert({
                where: { storeId_email: { storeId: store.id, email: c.email ?? '' } },
                update: {
                  name: c.name ?? undefined,
                  phone: c.phone ?? undefined,
                  stripeCustomerId: c.id,
                },
                create: {
                  storeId: store.id,
                  email: c.email ?? '',
                  name: c.name ?? null,
                  phone: c.phone ?? null,
                  stripeCustomerId: c.id,
                },
              }).catch(() => null)
            )
          );
        }
      }
    } catch {}

    return NextResponse.json({ customers: enriched, hasMore, lastId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/customers/stripe-sync — update a Stripe customer
export async function PATCH(req: NextRequest) {
  const stripeKey = await getStripeSecretKey();
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
  }

  try {
    const { customerId, name, email, phone, description, metadata } = await req.json();
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 });

    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (email) params.set('email', email);
    if (phone) params.set('phone', phone);
    if (description) params.set('description', description);
    if (metadata) {
      Object.entries(metadata).forEach(([k, v]) => params.set(`metadata[${k}]`, String(v)));
    }

    const updated = await stripeRequest<StripeCustomer>(`/customers/${customerId}`, stripeKey, {
      method: 'POST',
      body: params.toString(),
    });

    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface StripeCustomer {
  id: string;
  object: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  description: string | null;
  created: number;
  currency: string | null;
  balance: number;
  delinquent: boolean | null;
  metadata: Record<string, string>;
  address: {
    city: string | null;
    country: string | null;
    line1: string | null;
    line2: string | null;
    postal_code: string | null;
    state: string | null;
  } | null;
  subscriptions?: {
    data: Array<{
      id: string;
      status: string;
      current_period_end: number;
      items: { data: Array<{ price: { nickname: string | null; unit_amount: number | null; currency: string } }> };
    }>;
  };
  paymentMethods?: StripePaymentMethod[];
  charges?: StripeCharge[];
}

interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  receipt_url: string | null;
}
