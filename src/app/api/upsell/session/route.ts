import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

/**
 * POST /api/upsell/session
 * Called after Stripe checkout completes.
 * Retrieves customer + payment method, finds matching funnel, creates upsell session.
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
    }

    const { checkoutSessionId, funnelId } = await req.json();

    if (!checkoutSessionId) {
      return NextResponse.json({ error: 'checkoutSessionId required' }, { status: 400 });
    }

    // Retrieve Stripe checkout session with expanded payment intent
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['payment_intent', 'customer'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Checkout not paid' }, { status: 400 });
    }

    const stripeCustomerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer on session' }, { status: 400 });
    }

    // Get the saved payment method from the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
      limit: 1,
    });

    let paymentMethodId = paymentMethods.data[0]?.id;

    // Fallback: get from payment intent
    if (!paymentMethodId) {
      const pi = session.payment_intent as Stripe.PaymentIntent | null;
      paymentMethodId = (pi?.payment_method as string) ?? '';
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'No saved payment method found. Ensure setup_future_usage=off_session is set.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find the funnel to use
    let resolvedFunnelId = funnelId;
    if (!resolvedFunnelId) {
      // Auto-select the first active funnel
      const { data: funnels } = await supabase
        .from('upsell_funnels')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
      resolvedFunnelId = funnels?.[0]?.id ?? null;
    }

    if (!resolvedFunnelId) {
      return NextResponse.json({ error: 'No active funnel found' }, { status: 404 });
    }

    // Check if session already exists for this checkout
    const { data: existing } = await supabase
      .from('upsell_sessions')
      .select('id')
      .eq('stripe_checkout_session_id', checkoutSessionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ sessionId: existing.id });
    }

    // Create upsell session
    const { data: upsellSession, error } = await supabase
      .from('upsell_sessions')
      .insert({
        stripe_checkout_session_id: checkoutSessionId,
        stripe_customer_id: stripeCustomerId,
        stripe_payment_method_id: paymentMethodId,
        funnel_id: resolvedFunnelId,
        current_step_order: 1,
        status: 'active',
        customer_email: session.customer_details?.email ?? '',
        original_order_amount: session.amount_total ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sessionId: upsellSession.id });
  } catch (error) {
    console.error('[UPSELL SESSION] Create error:', error);
    return NextResponse.json({ error: 'Failed to create upsell session' }, { status: 500 });
  }
}

/**
 * GET /api/upsell/session?id=xxx
 * Returns upsell session with current step details
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session id required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: session, error } = await supabase
      .from('upsell_sessions')
      .select('*, upsell_funnels(*, funnel_steps(*))')
      .eq('id', id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Sort steps
    const funnel = session.upsell_funnels as Record<string, unknown> | null;
    if (funnel && Array.isArray(funnel.funnel_steps)) {
      funnel.funnel_steps = (funnel.funnel_steps as Record<string, unknown>[]).sort(
        (a, b) => (a.step_order as number) - (b.step_order as number)
      );
    }

    // Find current step
    const currentStep = funnel
      ? (funnel.funnel_steps as Record<string, unknown>[])?.find(
          (s) => (s.step_order as number) === (session.current_step_order as number)
        )
      : null;

    return NextResponse.json({ session, currentStep, funnel });
  } catch (error) {
    console.error('[UPSELL SESSION] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
