import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';
async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
    }

    const subscriptionId = params.subscriptionId;

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Pause in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        pause_collection: {
          behavior: 'keep_as_draft',
        },
      });
    }

    // Update local subscription
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'paused',
        pausedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription paused successfully',
    });
  } catch (error: any) {
    console.error('Pause subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to pause subscription', details: error.message },
      { status: 500 }
    );
  }
}
