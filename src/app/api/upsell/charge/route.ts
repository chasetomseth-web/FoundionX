import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

/**
 * POST /api/upsell/charge
 * Fires a 1-click off-session charge using saved payment method.
 * Body: { upsellSessionId, stepId, action: 'accept' | 'decline' }
 */
export async function POST(req: NextRequest) {
  try {
    const { upsellSessionId, stepId, action } = await req.json();

    if (!upsellSessionId || !stepId || !action) {
      return NextResponse.json(
        { error: 'upsellSessionId, stepId, and action are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('upsell_sessions')
      .select('*')
      .eq('id', upsellSessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Upsell session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Upsell session is no longer active' }, { status: 400 });
    }

    // Fetch the step
    const { data: step, error: stepError } = await supabase
      .from('funnel_steps')
      .select('*')
      .eq('id', stepId)
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: 'Funnel step not found' }, { status: 404 });
    }

    if (action === 'decline') {
      // Record decline, advance to decline_next_step_order
      const declinedSteps = [...(session.declined_step_orders ?? []), step.step_order];
      const nextStepOrder = step.decline_next_step_order ?? null;

      const newStatus = nextStepOrder ? 'active' : 'completed';

      await supabase
        .from('upsell_sessions')
        .update({
          declined_step_orders: declinedSteps,
          current_step_order: nextStepOrder ?? session.current_step_order,
          status: newStatus,
        })
        .eq('id', upsellSessionId);

      return NextResponse.json({
        action: 'declined',
        nextStepOrder,
        sessionComplete: !nextStepOrder,
      });
    }

    // action === 'accept' — fire off-session charge
    let paymentIntentId: string | null = null;
    let chargeStatus: 'succeeded' | 'failed' = 'succeeded';
    let errorMessage: string | null = null;

    try {
      const stripe = await getStripe();
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: step.price_cents,
        currency: step.currency ?? 'usd',
        customer: session.stripe_customer_id,
        payment_method: session.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description: `Upsell: ${step.name}`,
        metadata: {
          upsell_session_id: upsellSessionId,
          funnel_step_id: stepId,
          step_type: step.step_type,
        },
      });

      paymentIntentId = paymentIntent.id;
      chargeStatus = paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed';
    } catch (stripeError: unknown) {
      chargeStatus = 'failed';
      errorMessage =
        stripeError instanceof Error ? stripeError.message : 'Stripe charge failed';
      console.error('[UPSELL CHARGE] Stripe error:', stripeError);
    }

    // Record the charge
    await supabase.from('upsell_charges').insert({
      upsell_session_id: upsellSessionId,
      funnel_step_id: stepId,
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: session.stripe_customer_id,
      stripe_payment_method_id: session.stripe_payment_method_id,
      amount_cents: step.price_cents,
      currency: step.currency ?? 'usd',
      status: chargeStatus,
      error_message: errorMessage,
    });

    if (chargeStatus === 'failed') {
      return NextResponse.json(
        { action: 'accept', chargeStatus: 'failed', error: errorMessage },
        { status: 402 }
      );
    }

    // Charge succeeded — advance to accept_next_step_order
    const acceptedSteps = [...(session.accepted_step_orders ?? []), step.step_order];
    const nextStepOrder = step.accept_next_step_order ?? null;
    const newStatus = nextStepOrder ? 'active' : 'completed';
    const newRevenue = (session.total_upsell_revenue ?? 0) + step.price_cents;

    await supabase
      .from('upsell_sessions')
      .update({
        accepted_step_orders: acceptedSteps,
        current_step_order: nextStepOrder ?? session.current_step_order,
        status: newStatus,
        total_upsell_revenue: newRevenue,
      })
      .eq('id', upsellSessionId);

    return NextResponse.json({
      action: 'accepted',
      chargeStatus: 'succeeded',
      paymentIntentId,
      nextStepOrder,
      sessionComplete: !nextStepOrder,
    });
  } catch (error) {
    console.error('[UPSELL CHARGE] Error:', error);
    return NextResponse.json({ error: 'Failed to process upsell charge' }, { status: 500 });
  }
}
