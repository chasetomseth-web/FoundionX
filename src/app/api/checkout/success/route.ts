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

/**
 * GET /api/checkout/success
 * Handles post-checkout success — syncs order, triggers automations
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer', 'payment_intent'],
    });

    const { prisma } = await import('@/lib/prisma');

    const checkoutSession = await prisma.checkoutSession.findFirst({
      where: { stripeSessionId: sessionId },
      include: { order: { select: { orderNumber: true, id: true } } },
    });

    return NextResponse.json({
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      metadata: {
        ...session.metadata,
        orderId: checkoutSession?.order?.id ?? (session.metadata as any)?.orderId,
        orderNumber: checkoutSession?.order?.orderNumber ?? undefined,
      },
    });
  } catch (error) {
    console.error('[CHECKOUT] Success retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}
