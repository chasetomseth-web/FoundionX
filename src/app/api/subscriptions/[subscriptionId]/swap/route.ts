import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';

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

    // TODO: Verify customer session cookie

    const body = await request.json();
    const { newProductId, newPriceId } = body;

    if (!newProductId || !newPriceId) {
      return NextResponse.json(
        { error: 'newProductId and newPriceId are required' },
        { status: 400 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: params.subscriptionId },
      include: { customer: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Get new product details
    const newProduct = await prisma.product.findUnique({
      where: { id: newProductId },
    });

    if (!newProduct) {
      return NextResponse.json({ error: 'New product not found' }, { status: 404 });
    }

    // Update Stripe subscription
    if (subscription.stripeSubscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );

        // Get the current subscription item
        const currentItem = stripeSubscription.items.data[0];

        // Update subscription with new price
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [
            {
              id: currentItem.id,
              price: newPriceId,
            },
          ],
          proration_behavior: 'create_prorations',
        });
      } catch (stripeError: any) {
        console.error('Stripe swap error:', stripeError);
        return NextResponse.json(
          { error: 'Failed to swap product in Stripe', details: stripeError.message },
          { status: 500 }
        );
      }
    }

    // Update local subscription record
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        productId: newProductId,
        planName: newProduct.name,
        // Note: Amount should be updated based on the new price
        // This would require fetching price details from Stripe or your database
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Product swapped successfully',
    });

  } catch (error: any) {
    console.error('Swap product error:', error);
    return NextResponse.json(
      { error: 'Failed to swap product', details: error.message },
      { status: 500 }
    );
  }
}
