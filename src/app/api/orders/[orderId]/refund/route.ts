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
    const body = await request.json();
    const { amount, reason, type } = body;

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

    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Can only refund paid orders' },
        { status: 400 }
      );
    }

    if (order.refundStatus === 'refunded') {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 400 }
      );
    }

    if (!order.stripePaymentIntentId) {
      return NextResponse.json(
        { error: 'No payment intent found for this order' },
        { status: 400 }
      );
    }

    // Calculate refund amount in cents
    const fullAmount = Number(order.total);
    const refundAmount = type === 'full' ? fullAmount : Number(amount);
    const refundAmountCents = Math.round(refundAmount * 100);

    if (refundAmount <= 0 || refundAmount > fullAmount) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      );
    }

    // Call Stripe to issue refund
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: refundAmountCents,
      reason: reason || 'requested_by_customer',
    });

    // Update Order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        refundStatus: type === 'full' ? 'refunded' : 'partial',
        refundAmount: refundAmount,
        refundedAt: new Date(),
      },
    });

    // Reverse all affiliate commissions for this order
    await prisma.affiliateCommission.updateMany({
      where: { orderId: orderId },
      data: { status: 'reversed' },
    });

    // Append audit log
    await appendAuditLog({
      actorId: auth.userId || 'system',
      tenantId: order.store.organizationId,
      action: 'order.refunded',
      resourceType: 'order',
      resourceId: orderId,
      metadata: {
        amount: refundAmount,
        reason,
        type,
        stripeRefundId: refund.id,
      },
    });

    // TODO: Send refund confirmation email via email router
    // This would be handled by the email service

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
      },
    });
  } catch (error: unknown) {
    console.error('Refund error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process refund';
    return NextResponse.json(
      { error: 'REFUND_FAILED', message },
      { status: 500 }
    );
  }
}
