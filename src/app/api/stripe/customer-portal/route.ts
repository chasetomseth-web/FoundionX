/**
 * Stripe Customer Portal API
 * Creates a Stripe Billing Portal session for customer self-service
 * POST /api/stripe/customer-portal
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';
async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const returnUrl = body.returnUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:4028/portal/billing';

    // Get or create the Stripe customer from the session
    // In a full implementation, you'd look up the customer by auth session
    const customerId = body.customerId || request.headers.get('x-stripe-customer-id');

    if (!customerId) {
      return NextResponse.json(
        { error: 'No customer found. Please ensure you are logged in.' },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      flow_data: {
        type: 'payment_method_update',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[STRIPE PORTAL] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create portal session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}