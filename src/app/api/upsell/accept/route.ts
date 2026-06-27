/**
 * 1-Click Upsell Accept Route
 * Captures saved payment method from the initial checkout session
 * and creates a payment intent for the upsell product
 * POST /api/upsell/accept
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

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

    const body = await request.json();
    const { orderId, upsellProductId, upsellOfferId, storeId } = body;

    if (!orderId || (!upsellProductId && !upsellOfferId)) {
      return NextResponse.json({ error: 'Order ID and upsell product/offer required' }, { status: 400 });
    }

    // Get the original order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get the payment method from the Stripe payment intent
    if (!order.stripePaymentIntentId) {
      return NextResponse.json({ error: 'Original order has no payment intent' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, {
      expand: ['payment_method'],
    });

    if (!paymentIntent.payment_method || typeof paymentIntent.payment_method === 'string') {
      return NextResponse.json({ error: 'No saved payment method available' }, { status: 400 });
    }

    const paymentMethodId = paymentIntent.payment_method.id;

    // Resolve upsell product details
    let upsellName = 'Special Offer';
    let upsellAmount = 0;
    let upsellCurrency = order.currency.toLowerCase();

    if (upsellOfferId) {
      const offer = await prisma.offer.findUnique({
        where: { id: upsellOfferId },
        include: { prices: true, product: true },
      });
      if (offer) {
        upsellName = offer.name;
        upsellCurrency = offer.currency.toLowerCase();
        const price = offer.prices[0];
        if (price) {
          upsellAmount = Number(price.amount);
        }
      }
    } else if (upsellProductId) {
      const product = await prisma.product.findUnique({ where: { id: upsellProductId } });
      if (product) {
        upsellName = product.name;
        upsellAmount = Number(product.price);
      }
    }

    if (upsellAmount <= 0) {
      return NextResponse.json({ error: 'Invalid upsell amount' }, { status: 400 });
    }

    // Create a payment intent using the saved payment method
    const upsellPaymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(upsellAmount * 100),
      currency: upsellCurrency,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        orderId,
        type: 'upsell',
        upsellProductId: upsellProductId ?? '',
        upsellOfferId: upsellOfferId ?? '',
        storeId: storeId ?? order.storeId,
      },
    });

    // Create upsell order item
    await prisma.orderItem.create({
      data: {
        orderId,
        productId: upsellProductId ?? undefined,
        name: upsellName,
        quantity: 1,
        price: upsellAmount,
        total: upsellAmount,
        isUpsell: true,
        metadata: {
          upsellPaymentIntentId: upsellPaymentIntent.id,
          upsellOfferId: upsellOfferId ?? undefined,
        },
      },
    });

    // Update original order total
    await prisma.order.update({
      where: { id: orderId },
      data: {
        total: { increment: upsellAmount },
        subtotal: { increment: upsellAmount },
      },
    });

    return NextResponse.json({
      success: true,
      paymentIntentId: upsellPaymentIntent.id,
      amount: upsellAmount,
      status: upsellPaymentIntent.status,
    });
  } catch (error) {
    console.error('[UPSELL ACCEPT] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process upsell';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}