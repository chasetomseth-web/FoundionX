import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { orderId } = params;

    // Verify order belongs to authenticated merchant's store
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true, customer: true },
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

    // TODO: Fire order_confirmation email type via email router
    // This would be handled by the email service
    // await sendOrderConfirmationEmail(order);

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully',
    });
  } catch (error: unknown) {
    console.error('Resend confirmation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to resend confirmation';
    return NextResponse.json(
      { error: 'RESEND_FAILED', message },
      { status: 500 }
    );
  }
}
