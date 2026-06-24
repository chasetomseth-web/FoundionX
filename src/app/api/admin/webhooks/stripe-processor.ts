/**
 * Stripe event direct processor (used by admin replay — skips signature verification)
 */
import { prisma } from '@/lib/prisma';

export async function processStripeEventDirect(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  // Re-use the same logic as the webhook handler but without signature check
  // The payload IS the full Stripe event object stored in WebhookEvent.payload
  const data = (payload.data as Record<string, unknown>)?.object as Record<string, unknown> ?? {};

  switch (eventType) {
    case 'checkout.session.completed': {
      const storeId = (data.metadata as Record<string, string>)?.storeId;
      if (!storeId) return;
      // Minimal re-process: ensure order exists and is marked paid
      const sessionId = data.id as string;
      if (sessionId) {
        await prisma.order.updateMany({
          where: { stripeCheckoutSessionId: sessionId },
          data: { paymentStatus: 'paid' },
        });
      }
      break;
    }
    case 'customer.subscription.updated': case'customer.subscription.created': {
      const stripeSubId = data.id as string;
      if (stripeSubId) {
        const statusMap: Record<string, string> = {
          active: 'active', canceled: 'canceled', past_due: 'past_due',
          paused: 'paused', trialing: 'trialing',
        };
        const stripeStatus = data.status as string;
        if (stripeStatus) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: stripeSubId },
            data: { status: statusMap[stripeStatus] ?? stripeStatus },
          });
        }
      }
      break;
    }
    default:
      console.log(`[STRIPE REPLAY] Unhandled event type: ${eventType}`);
  }
}
