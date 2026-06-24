import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapEasyPostStatus, mapStatusToFulfillment } from '@/lib/easypost';
import { sendTransactionalEmail } from '@/lib/email';

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

// POST /api/webhooks/easypost — EasyPost tracking event webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Only handle tracker events
    if (body.object !== 'Event') {
      return NextResponse.json({ received: true });
    }

    const description: string = body.description ?? '';
    if (!description.startsWith('tracker.')) {
      return NextResponse.json({ received: true });
    }

    const tracker = body.result;
    if (!tracker) {
      return NextResponse.json({ received: true });
    }

    const trackingCode: string = tracker.tracking_code;
    const easypostStatus: string = tracker.status;
    const eventId: string = body.id;

    // Idempotency: skip if already processed
    const alreadyProcessed = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "TrackingEvent" WHERE "easypostEventId" = ${eventId}
    `;
    if (alreadyProcessed[0]?.count > 0n) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Find shipment by tracking code
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber: trackingCode },
      include: {
        order: {
          include: { customer: true },
        },
      },
    });

    if (!shipment) {
      // Unknown tracking code — still return 200 to prevent EasyPost retries
      console.warn(`[EASYPOST WEBHOOK] No shipment found for tracking code: ${trackingCode}`);
      return NextResponse.json({ received: true });
    }

    const mappedStatus = mapEasyPostStatus(easypostStatus);
    const fulfillmentStatus = mapStatusToFulfillment(mappedStatus);

    // Get latest tracking detail for location/message
    const latestDetail = tracker.tracking_details?.slice(-1)[0];
    const location = latestDetail?.tracking_location
      ? [
          latestDetail.tracking_location.city,
          latestDetail.tracking_location.state,
          latestDetail.tracking_location.country,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    // Save tracking event to history
    await prisma.$executeRaw`
      INSERT INTO "TrackingEvent" ("id", "shipmentId", "easypostEventId", "status", "message", "location", "carrier", "eventTime", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${shipment.id},
        ${eventId},
        ${easypostStatus},
        ${latestDetail?.message ?? null},
        ${location},
        ${tracker.carrier ?? null},
        ${latestDetail?.datetime ? new Date(latestDetail.datetime) : new Date()},
        NOW()
      )
    `;

    // Update shipment status
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: mappedStatus === 'delivered' ? 'delivered' : 'in_transit',
        ...(mappedStatus === 'shipped' ? { shippedAt: new Date() } : {}),
        ...(mappedStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
      },
    });

    // Update order fulfillment status
    if (shipment.order) {
      await prisma.order.update({
        where: { id: shipment.order.id },
        data: {
          fulfillmentStatus,
          status: mappedStatus === 'delivered' ? 'delivered' : 'processing',
        },
      });
    }

    // Send Brevo email based on status
    const order = shipment.order;
    if (order?.customer?.email) {
      const sender = await getSenderPreference();
      if (sender.senderEmail) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
        const trackingPageUrl = `${siteUrl}/track/${trackingCode}`;

        try {
          if (mappedStatus === 'shipped') {
            await sendTransactionalEmail({
              to: order.customer.email,
              from: `${sender.senderName} <${sender.senderEmail}>`,
              subject: `Your order ${order.orderNumber} has shipped!`,
              html: buildShippedEmail({
                name: order.customer.name ?? 'there',
                orderNumber: order.orderNumber,
                carrier: shipment.carrier ?? tracker.carrier ?? '',
                trackingCode,
                trackingUrl: trackingPageUrl,
                storeName: sender.senderName,
              }),
            });
          } else if (mappedStatus === 'out_for_delivery') {
            await sendTransactionalEmail({
              to: order.customer.email,
              from: `${sender.senderName} <${sender.senderEmail}>`,
              subject: `Your order ${order.orderNumber} is out for delivery today!`,
              html: buildOutForDeliveryEmail({
                name: order.customer.name ?? 'there',
                orderNumber: order.orderNumber,
                carrier: shipment.carrier ?? tracker.carrier ?? '',
                trackingCode,
                trackingUrl: trackingPageUrl,
                storeName: sender.senderName,
              }),
            });
          } else if (mappedStatus === 'delivered') {
            await sendTransactionalEmail({
              to: order.customer.email,
              from: `${sender.senderName} <${sender.senderEmail}>`,
              subject: `Your order ${order.orderNumber} has been delivered! 🎉`,
              html: buildDeliveredEmail({
                name: order.customer.name ?? 'there',
                orderNumber: order.orderNumber,
                storeName: sender.senderName,
              }),
            });
          }
        } catch (emailErr) {
          console.error('[EASYPOST WEBHOOK] Email send failed:', emailErr);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[EASYPOST WEBHOOK] Error:', error);
    // Return 200 to prevent EasyPost from retrying on our processing errors
    return NextResponse.json({ received: true });
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

function buildShippedEmail(p: {
  name: string;
  orderNumber: string;
  carrier: string;
  trackingCode: string;
  trackingUrl: string;
  storeName: string;
}): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
<p>Hi ${p.name},</p>
<p>Your order is on its way! 🚚</p>
<div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #bbf7d0;">
  <p style="font-weight:700;margin:0 0 8px;">Shipping Details</p>
  <p style="margin:4px 0;">Order: <strong>${p.orderNumber}</strong></p>
  <p style="margin:4px 0;">Carrier: <strong>${p.carrier}</strong></p>
  <p style="margin:4px 0;">Tracking #: <strong>${p.trackingCode}</strong></p>
</div>
<a href="${p.trackingUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0;">Track Your Package</a>
<p style="margin-top:16px;">Thanks for your order,<br/><strong>${p.storeName}</strong></p>
</div>`;
}

function buildOutForDeliveryEmail(p: {
  name: string;
  orderNumber: string;
  carrier: string;
  trackingCode: string;
  trackingUrl: string;
  storeName: string;
}): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
<p>Hi ${p.name},</p>
<p>Your package is out for delivery today! 📦</p>
<div style="background:#fffbeb;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #fde68a;">
  <p style="font-weight:700;margin:0 0 8px;">Delivery Today</p>
  <p style="margin:4px 0;">Order: <strong>${p.orderNumber}</strong></p>
  <p style="margin:4px 0;">Carrier: <strong>${p.carrier}</strong></p>
  <p style="margin:4px 0;">Tracking #: <strong>${p.trackingCode}</strong></p>
</div>
<a href="${p.trackingUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0;">Track Your Package</a>
<p style="margin-top:16px;">Thanks for your order,<br/><strong>${p.storeName}</strong></p>
</div>`;
}

function buildDeliveredEmail(p: {
  name: string;
  orderNumber: string;
  storeName: string;
}): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
<p>Hi ${p.name},</p>
<p>Your package has been delivered! 🎉</p>
<div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #bbf7d0;">
  <p style="font-weight:700;margin:0 0 8px;">Delivered</p>
  <p style="margin:4px 0;">Order: <strong>${p.orderNumber}</strong></p>
  <p style="margin:4px 0;color:#16a34a;">✓ Successfully delivered</p>
</div>
<p>We hope you love your order! If you have any questions, just reply to this email.</p>
<p>Thanks for shopping with us,<br/><strong>${p.storeName}</strong></p>
</div>`;
}
