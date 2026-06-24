/**
 * Brevo event direct processor (used by admin replay)
 */
import { prisma } from '@/lib/prisma';

export async function processBrevoEventDirect(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const email = payload.email as string;
  if (!email) return;

  switch (eventType) {
    case 'opened': {
      const campaignId = payload['campaign-id'] as number;
      if (campaignId) {
        await prisma.emailCampaign.updateMany({
          where: { brevoCampaignId: campaignId },
          data: { openCount: { increment: 1 } },
        });
      }
      break;
    }
    case 'click': {
      const campaignId = payload['campaign-id'] as number;
      if (campaignId) {
        await prisma.emailCampaign.updateMany({
          where: { brevoCampaignId: campaignId },
          data: { clickCount: { increment: 1 } },
        });
      }
      break;
    }
    case 'unsubscribed': {
      await prisma.customer.updateMany({
        where: { email },
        data: { acceptsMarketing: false },
      });
      break;
    }
    default:
      console.log(`[BREVO REPLAY] Unhandled event type: ${eventType}`);
  }
}
