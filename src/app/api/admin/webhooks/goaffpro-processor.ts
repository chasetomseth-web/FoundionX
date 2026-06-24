/**
 * GoAffPro event direct processor (used by admin replay)
 */
import { prisma } from '@/lib/prisma';

export async function processGoAffProEventDirect(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (eventType) {
    case 'commission.created': {
      const data = payload.commission as Record<string, unknown>;
      const affiliate = await prisma.affiliate.findFirst({
        where: { goaffproAffiliateId: String(data?.affiliate_id) },
      });
      if (!affiliate) return;

      const goaffproCommissionId = String(data?.id);
      const existing = await prisma.affiliateCommission.findFirst({
        where: { goaffproCommissionId },
      });
      if (existing) return; // Already processed — idempotent

      await prisma.affiliateCommission.create({
        data: {
          affiliateId: affiliate.id,
          orderId: data?.order_id as string ?? undefined,
          type: (data?.type as string) === 'recurring' ? 'recurring' : 'one_time',
          amount: (data?.amount as number) ?? 0,
          rate: ((data?.rate as number) ?? 10) / 100,
          orderTotal: (data?.order_total as number) ?? 0,
          status: 'pending',
          goaffproCommissionId,
        },
      });
      break;
    }
    default:
      console.log(`[GOAFFPRO REPLAY] Unhandled event type: ${eventType}`);
  }
}
