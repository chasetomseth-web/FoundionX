import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestWebhook } from '@/lib/webhook-engine';
import { invalidateOnGoAffProEvent } from '@/lib/redis-lock';
import { getCorrelationId } from '@/lib/observability';
import crypto from 'crypto';

const GOAFFPRO_WEBHOOK_SECRET = process.env.GOAFFPRO_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const correlationId = getCorrelationId(req);

  // Verify GoAffPro webhook signature
  const signature = req.headers.get('x-goaffpro-signature');
  if (GOAFFPRO_WEBHOOK_SECRET && signature) {
    const expectedSig = crypto
      .createHmac('sha256', GOAFFPRO_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    if (signature !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = payload.event as string;
  const eventId = (payload.id as string) ?? `goaffpro_${Date.now()}_${crypto.randomUUID()}`;

  // Resolve tenant from store_id
  const storeId = payload.store_id as string | undefined;
  let organizationId: string | undefined;
  let tenantId: string | undefined;

  if (storeId) {
    const store = await prisma.store.findFirst({ where: { goaffproStoreId: storeId } });
    organizationId = store?.organizationId;
    tenantId = store?.id;
  }

  const result = await ingestWebhook(
    {
      source: 'goaffpro',
      eventType,
      eventId,
      rawBody: body,
      payload,
      organizationId,
      tenantId,
      correlationId,
    },
    async (p) => {
      await processGoAffProEvent(eventType, p);
      if (tenantId) {
        await invalidateOnGoAffProEvent(eventType, tenantId);
      }
    }
  );

  if (result.status === 'duplicate') {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (result.status === 'locked') {
    return NextResponse.json({ received: true, queued: true });
  }
  if (result.status === 'dead_lettered' || result.status === 'failed') {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true, correlationId: result.correlationId });
}

async function processGoAffProEvent(eventType: string, payload: Record<string, unknown>) {
  switch (eventType) {
    case 'affiliate.approved': case'affiliate.created': {
      const data = payload.affiliate as Record<string, unknown>;
      if (!data?.email) return;

      const store = await prisma.store.findFirst({
        where: { goaffproStoreId: payload.store_id as string },
      });
      if (!store) return;

      await prisma.affiliate.upsert({
        where: { goaffproAffiliateId: String(data.id) },
        create: {
          storeId: store.id,
          email: data.email as string,
          name: (data.name as string) ?? (data.email as string),
          goaffproAffiliateId: String(data.id),
          referralCode: (data.ref_code as string) ?? generateCode(data.email as string),
          status: eventType === 'affiliate.approved' ? 'active' : 'pending',
          commissionRate: ((data.commission_rate as number) ?? 10) / 100,
        },
        update: {
          status: eventType === 'affiliate.approved' ? 'active' : 'pending',
          name: (data.name as string) ?? undefined,
        },
      });
      break;
    }

    case 'commission.created': {
      const data = payload.commission as Record<string, unknown>;
      const affiliate = await prisma.affiliate.findFirst({
        where: { goaffproAffiliateId: String(data?.affiliate_id) },
      });
      if (!affiliate) return;

      // Idempotent commission creation
      const goaffproCommissionId = String(data?.id);
      const existing = await prisma.affiliateCommission.findFirst({
        where: { goaffproCommissionId },
      });
      if (existing) return;

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

      await prisma.affiliate.update({
        where: { id: affiliate.id },
        data: {
          totalEarned: { increment: (data?.amount as number) ?? 0 },
          pendingBalance: { increment: (data?.amount as number) ?? 0 },
          totalConversions: { increment: 1 },
        },
      });
      break;
    }

    case 'payout.completed': {
      const data = payload.payout as Record<string, unknown>;
      const affiliate = await prisma.affiliate.findFirst({
        where: { goaffproAffiliateId: String(data?.affiliate_id) },
      });
      if (!affiliate) return;

      await prisma.affiliatePayout.create({
        data: {
          affiliateId: affiliate.id,
          amount: (data?.amount as number) ?? 0,
          method: (data?.method as string) ?? 'paypal',
          status: 'completed',
          reference: data?.reference as string ?? undefined,
          processedAt: new Date(),
        },
      });

      await prisma.affiliate.update({
        where: { id: affiliate.id },
        data: {
          totalPaid: { increment: (data?.amount as number) ?? 0 },
          pendingBalance: { decrement: (data?.amount as number) ?? 0 },
        },
      });
      break;
    }

    default:
      console.log(`[GOAFFPRO WEBHOOK] Unhandled event: ${eventType}`);
  }
}

function generateCode(email: string): string {
  return (
    email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8) +
    '_' +
    Math.random().toString(36).slice(2, 6)
  );
}
