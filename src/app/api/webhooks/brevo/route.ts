import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestWebhook } from '@/lib/webhook-engine';
import { invalidateOnBrevoEvent } from '@/lib/redis-lock';
import { getCorrelationId } from '@/lib/observability';
import crypto from 'crypto';
import { parseInboundEmail } from '@/lib/email/inbound-parser';
import { tagTicket } from '@/lib/ai/tagTicket';

const BREVO_WEBHOOK_SECRET = process.env.BREVO_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const correlationId = getCorrelationId(req);

  // Verify Brevo webhook signature if configured
  const signature = req.headers.get('x-brevo-signature');
  if (BREVO_WEBHOOK_SECRET && signature) {
    const expectedSig = crypto
      .createHmac('sha256', BREVO_WEBHOOK_SECRET)
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
  const messageId = (payload['message-id'] as string) ?? `brevo_${Date.now()}_${crypto.randomUUID()}`;

  // Resolve tenant from email (best-effort)
  const email = payload.email as string | undefined;
  let tenantId: string | undefined;
  if (email) {
    const customer = await prisma.customer.findFirst({ where: { email } });
    if (customer) {
      const store = await prisma.store.findUnique({ where: { id: customer.storeId } });
      tenantId = store?.id;
    }
  }

  const result = await ingestWebhook(
    {
      source: 'brevo',
      eventType,
      eventId: messageId,
      rawBody: body,
      payload,
      tenantId,
      correlationId,
    },
    async (p) => {
      await processBrevoEvent(eventType, p);
      if (tenantId) {
        await invalidateOnBrevoEvent(eventType, tenantId);
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

async function processBrevoEvent(eventType: string, payload: Record<string, unknown>) {
  const email = payload.email as string;
  if (!email) return;
  // Detect inbound parsing payloads (Brevo inbound parsing will include html/text fields)
  const looksLikeInbound = Boolean(
    (payload as any).text || (payload as any).html || (payload as any).body_text || (payload as any).data?.text
  );

  if (looksLikeInbound) {
    try {
      const parsed = parseInboundEmail(payload);
      if (!parsed.senderEmail) return;

      // Try to resolve tenant and organization via customer -> store -> organization
      const customer = await prisma.customer.findFirst({ where: { email: parsed.senderEmail } });
      if (!customer) {
        console.log('[BREVO INBOUND] No matching customer for', parsed.senderEmail);
        return;
      }

      const store = await prisma.store.findUnique({ where: { id: customer.storeId } });
      if (!store) {
        console.log('[BREVO INBOUND] No store for customer', parsed.senderEmail);
        return;
      }

      const organizationId = store.organizationId;

      // Threading: attach to latest open ticket for this customer, otherwise create new
      let ticket = await prisma.supportTicket.findFirst({
        where: { customerEmail: parsed.senderEmail, organizationId, status: 'open' },
        orderBy: { updatedAt: 'desc' },
      });

      if (!ticket) {
        ticket = await prisma.supportTicket.create({
          data: {
            organizationId,
            customerEmail: parsed.senderEmail,
            customerName: customer.name ?? undefined,
            subject: parsed.subject ?? 'No subject',
          },
        });
      }

      // Persist inbound message
      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: 'customer',
          senderEmail: parsed.senderEmail,
          body: parsed.body,
        },
      });

      // Auto-tag
      const tags = tagTicket(parsed.subject + '\n' + parsed.body);
      for (const t of tags) {
        try {
          await prisma.supportTag.create({ data: { ticketId: ticket.id, tag: t } });
        } catch (e) {
          // ignore unique constraint errors
        }
      }

      // Update ticket updatedAt/status
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'open' } });

      return;
    } catch (e) {
      console.error('[BREVO INBOUND] processing failed', e);
    }
  }

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

    case 'bounced': case'hard_bounce': {
      const campaignId = payload['campaign-id'] as number;
      if (campaignId) {
        await prisma.emailCampaign.updateMany({
          where: { brevoCampaignId: campaignId },
          data: { bounceCount: { increment: 1 } },
        });
      }
      break;
    }

    default:
      console.log(`[BREVO WEBHOOK] Unhandled event: ${eventType}`);
  }
}
