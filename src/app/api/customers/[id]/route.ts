import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { getStripeSecretKey } from '@/lib/stripe';

export const runtime = 'nodejs';
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'customers:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Find the customer in the local DB by the Stripe customer ID
    const store = await prisma.store.findFirst({
      where: { organizationId: session.organizationId },
    });
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const customer = await prisma.customer.findFirst({
      where: { storeId: store.id, stripeCustomerId: id },
    });

    if (!customer) {
      // Customer not in local DB — archive in Stripe directly and return success
      const stripeKey2 = await getStripeSecretKey();
      if (stripeKey2) {
        const b = new URLSearchParams();
        b.set('metadata[deleted]', 'true');
        await fetch(`https://api.stripe.com/v1/customers/${id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${stripeKey2}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: b.toString(),
        });
      }
      return NextResponse.json({ success: true });
    }

    // Archive the customer in Stripe (Stripe doesn't allow true deletion of customers with payment history)
    const stripeKey = await getStripeSecretKey();
    if (stripeKey && customer.stripeCustomerId) {
      const stripeBody = new URLSearchParams();
      stripeBody.set('metadata[deleted]', 'true');

      const stripeRes = await fetch(
        `https://api.stripe.com/v1/customers/${customer.stripeCustomerId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: stripeBody.toString(),
        }
      );

      if (!stripeRes.ok) {
        const stripeError = await stripeRes.json();
        console.error(
          '[CUSTOMERS] Stripe archive error:',
          stripeError.error?.message ?? 'Unknown'
        );
        // Non-fatal — continue with local deletion
      }
    }

    // Delete the customer from the local database
    await prisma.customer.delete({
      where: { id: customer.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      '[CUSTOMERS] Delete error:',
      error instanceof Error ? error.message : JSON.stringify(error),
      error
    );
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}