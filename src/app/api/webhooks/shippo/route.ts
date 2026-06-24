import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapShippoStatus, mapStatusToFulfillment } from '@/lib/shippo';
import { sendEmail, EmailType } from '@/lib/email/emailRouter';
import { systemLog } from '@/lib/logger';

// POST /api/webhooks/shippo — Shippo tracking event webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body;
    const tracking = event?.data;

    if (!tracking || !tracking.tracking_number) {
      return NextResponse.json({ received: true });
    }

    const trackingCode: string = tracking.tracking_number;
    const shippoStatus: string = tracking.tracking_status?.status ?? tracking.status ?? '';
    const eventId: string | null = event.object_id ?? event.id ?? event.event_id ?? null;

    if (eventId) {
      const alreadyProcessed = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "TrackingEvent" WHERE "easypostEventId" = ${eventId}
      `;
      if (alreadyProcessed[0]?.count > BigInt(0)) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber: trackingCode },
      include: {
        order: {
          include: { customer: true },
        },
      },
    });

    if (!shipment) {
      systemLog.warn('[SHIPPO WEBHOOK] No shipment found for tracking code', {
        trackingCode,
      });
      return NextResponse.json({ received: true });
    }

    const mappedStatus = mapShippoStatus(shippoStatus);
    const fulfillmentStatus = mapStatusToFulfillment(mappedStatus);

    const history = Array.isArray(tracking.tracking_history) ? tracking.tracking_history : [];
    const latestDetail = history.slice(-1)[0] ?? tracking.tracking_status;
    const location = latestDetail?.location
      ? [latestDetail.location.city, latestDetail.location.state, latestDetail.location.country]
          .filter(Boolean)
          .join(', ')
      : latestDetail?.status_location
      ? [latestDetail.status_location.city, latestDetail.status_location.state, latestDetail.status_location.country]
          .filter(Boolean)
          .join(', ')
      : null;

    await prisma.$executeRaw`
      INSERT INTO "TrackingEvent" ("id", "shipmentId", "easypostEventId", "status", "message", "location", "carrier", "eventTime", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${shipment.id},
        ${eventId},
        ${shippoStatus},
        ${latestDetail?.status_details ?? latestDetail?.status ?? null},
        ${location},
        ${tracking.carrier ?? null},
        ${latestDetail?.occurred_at ? new Date(latestDetail.occurred_at) : latestDetail?.status_date ? new Date(latestDetail.status_date) : new Date()},
        NOW()
      )
    `;

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: mappedStatus === 'delivered' ? 'delivered' : 'in_transit',
        ...(mappedStatus === 'shipped' ? { shippedAt: new Date() } : {}),
        ...(mappedStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
      },
    });

    if (shipment.order) {
      await prisma.order.update({
        where: { id: shipment.order.id },
        data: {
          fulfillmentStatus,
          status: mappedStatus === 'delivered' ? 'delivered' : 'processing',
        },
      });
    }

    const order = shipment.order;
    if (order?.customer?.email) {
      const customerName = order.customer.name ?? undefined;
      const orderNumber = order.orderNumber;

      try {
        if (mappedStatus === 'shipped' || mappedStatus === 'in_transit') {
          await sendEmail({
            type: EmailType.ORDER_SHIPPED,
            data: {
              email: order.customer.email,
              name: customerName,
              orderNumber,
              trackingNumber: trackingCode,
              carrier: shipment.carrier ?? tracking.carrier ?? 'Carrier',
              trackingUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/track/${trackingCode}`,
            },
          });
        } else if (mappedStatus === 'delivered') {
          await sendEmail({
            type: EmailType.ORDER_DELIVERED,
            data: {
              email: order.customer.email,
              name: customerName,
              orderNumber,
            },
          });
        }
      } catch (emailErr) {
        systemLog.error('[SHIPPO WEBHOOK] Email send failed', {
          error: { message: emailErr instanceof Error ? emailErr.message : String(emailErr) },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    systemLog.error('[SHIPPO WEBHOOK] Error', {
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ received: true });
  }
}