import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';
import { appendAuditLog } from '@/lib/audit-log';

async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
    }

    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { orderId } = params;

    // Verify order belongs to authenticated merchant's store
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if user owns this store
    if (order.store.organizationId !== auth.organizationId) {
      return NextResponse.json(
        { error: 'You do not have access to this order' },
        { status: 403 }
      );
    }

    if (order.fulfillmentStatus !== 'unfulfilled') {
      return NextResponse.json(
        { error: 'Can only cancel unfulfilled orders' },
        { status: 400 }
      );
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      );
    }

    // Issue full refund if payment was made
    if (order.stripePaymentIntentId && order.paymentStatus === 'paid') {
      const refundAmountCents = Math.round(Number(order.total) * 100);
      
      await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: refundAmountCents,
        reason: 'requested_by_customer',
      });
    }

    // Update Order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        fulfillmentStatus: 'cancelled',
        cancelledAt: new Date(),
        refundStatus: order.paymentStatus === 'paid' ? 'refunded' : order.refundStatus,
        refundAmount: order.paymentStatus === 'paid' ? order.total : order.refundAmount,
        refundedAt: order.paymentStatus === 'paid' ? new Date() : order.refundedAt,
      },
    });

    // Reverse affiliate commissions
    await prisma.affiliateCommission.updateMany({
      where: { orderId: orderId },
      data: { status: 'reversed' },
    });

    // Append audit log
    await appendAuditLog({
      actorId: auth.userId || 'system',
      tenantId: order.store.organizationId,
      action: 'order.status.changed',
      resourceType: 'order',
      resourceId: orderId,
      before: { status: order.status },
      after: { status: 'cancelled' },
      metadata: { cancelledAt: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error: unknown) {
    console.error('Cancel order error:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel order';
    return NextResponse.json(
      { error: 'CANCEL_FAILED', message },
      { status: 500 }
    );
  }
}
