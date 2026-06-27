import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { createShipment, buyShipment, getCheapestRate } from '@/lib/shippo';
import { sendTransactionalEmail } from '@/lib/email';

export const runtime = 'nodejs';
async function getSenderPreference(): Promise<{ senderEmail: string; senderName: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('integration_settings')
      .select('credentials')
      .eq('provider', 'email_sender_preference')
      .maybeSingle();
    const creds = (data?.credentials as Record<string, string>) ?? {};
    return { senderEmail: creds.senderEmail ?? '', senderName: creds.senderName ?? 'Store' };
  } catch {
    return { senderEmail: '', senderName: 'Store' };
  }
}

// POST /api/shipping/create-label — create Shippo label for an order
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { orderId, toAddress, fromAddress, parcel, rateId, shipmentId: existingShipmentId } = body;

    if (!orderId || !toAddress || !fromAddress || !parcel) {
      return NextResponse.json(
        { error: 'orderId, toAddress, fromAddress, and parcel are required' },
        { status: 400 }
      );
    }

    if (!process.env.SHIPPO_API_KEY) {
      return NextResponse.json(
        { error: 'Shippo API key not configured. Add SHIPPO_API_KEY to your environment variables.' },
        { status: 503 }
      );
    }

    const store = await prisma.store.findFirst({
      where: { organizationId: session.organizationId },
    });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      include: { customer: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Step 1: Create or reuse shipment and buy label
    let transaction;
    if (existingShipmentId && rateId) {
      transaction = await buyShipment(rateId);
    } else {
      const createdShipment = await createShipment({ toAddress, fromAddress, parcel });
      const selectedRateId = rateId ?? getCheapestRate(createdShipment.rates)?.object_id;
      if (!selectedRateId) {
        return NextResponse.json({ error: 'No rates available for this shipment' }, { status: 400 });
      }
      transaction = await buyShipment(selectedRateId);
    }

    const trackingCode = transaction.tracking_number ?? '';
    const labelUrl = transaction.label_url ?? '';
    const trackingUrl = transaction.tracking_url_provider ?? null;
    const carrier = transaction.carrier ?? transaction.rate?.provider ?? 'Unknown';
    const service = transaction.rate?.servicelevel?.name ?? 'Standard';
    const rateAmount = transaction.rate ? parseFloat(transaction.rate.amount) : 0;

    // Step 2: Save shipment to DB
    const dbShipment = await prisma.shipment.create({
      data: {
        orderId,
        carrier,
        trackingNumber: trackingCode,
        trackingUrl,
        status: 'pending',
        // @ts-ignore — extended fields added via migration
        labelUrl,
        // @ts-ignore — extended fields added via migration
        service,
        // @ts-ignore — extended fields added via migration
        rateAmount,
        // @ts-ignore — extended fields added via migration
        labelCreatedAt: new Date(),
      },
    });

    // Step 3: Update order fulfillment status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: 'processing',
        status: 'processing',
      },
    });

    // Step 4: Send "label created" email via Brevo
    if (order.customer?.email) {
      try {
        const sender = await getSenderPreference();
        if (sender.senderEmail) {
          await sendTransactionalEmail({
            to: order.customer.email,
            from: `${sender.senderName} <${sender.senderEmail}>`,
            subject: `Your order ${order.orderNumber} is being prepared`,
            html: buildLabelCreatedEmail({
              name: order.customer.name ?? 'there',
              orderNumber: order.orderNumber,
              carrier,
              trackingCode,
              storeName: sender.senderName,
            }),
          });
        }
      } catch (emailErr) {
        console.error('[CREATE LABEL] Label created email failed:', emailErr);
      }
    }

    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        action: 'shipment.label_created',
        resource: 'shipment',
        resourceId: dbShipment.id,
        metadata: { orderId, trackingCode, carrier, labelUrl },
      },
    });

    return NextResponse.json({
      shipmentId: dbShipment.id,
      trackingCode,
      carrier,
      service,
      labelUrl,
      trackingUrl,
      rateAmount,
    });
  } catch (error) {
    console.error('[CREATE LABEL] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create shipping label' },
      { status: 500 }
    );
  }
}

function buildLabelCreatedEmail(params: {
  name: string;
  orderNumber: string;
  carrier: string;
  trackingCode: string;
  storeName: string;
}): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
<p>Hi ${params.name},</p>
<p>Great news — we've created a shipping label for your order and it's being prepared for shipment.</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e2e8f0;">
  <p style="font-weight:700;margin:0 0 8px;">Order Details</p>
  <p style="margin:4px 0;">Order: <strong>${params.orderNumber}</strong></p>
  <p style="margin:4px 0;">Carrier: <strong>${params.carrier}</strong></p>
  ${params.trackingCode ? `<p style="margin:4px 0;">Tracking #: <strong>${params.trackingCode}</strong></p>` : ''}
</div>
<p>Your package hasn't shipped yet — we'll send you another email with tracking information as soon as it's on its way.</p>
<p>Thanks for your order,<br/><strong>${params.storeName}</strong></p>
</div>`;
}
