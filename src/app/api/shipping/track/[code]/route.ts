import { NextRequest, NextResponse } from 'next/server';

// Check if DATABASE_URL is a valid postgres URL
export const runtime = 'nodejs';
function hasValidDatabaseUrl(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

// GET /api/shipping/track/[code] — public tracking endpoint (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: 'Tracking code required' }, { status: 400 });
  }

  try {
    let shipment: {
      id: string;
      carrier: string | null;
      status: string | null;
      trackingUrl: string | null;
      labelUrl?: string | null;
      order?: {
        orderNumber: string;
        createdAt: Date;
        customer?: { name: string | null } | null;
      } | null;
    } | null = null;

    let trackingEvents: Array<{
      status: string;
      message: string | null;
      location: string | null;
      eventTime: Date | null;
      createdAt: Date;
    }> = [];

    // Only query DB if DATABASE_URL is valid
    if (hasValidDatabaseUrl()) {
      try {
        const { prisma } = await import('@/lib/prisma');
        shipment = await prisma.shipment.findFirst({
          where: { trackingNumber: code },
          include: {
            order: {
              select: {
                orderNumber: true,
                createdAt: true,
                customer: { select: { name: true } },
              },
            },
          },
        });

        if (shipment) {
          // @ts-ignore — extended via migration
          const events = await prisma.$queryRaw<typeof trackingEvents>`
            SELECT status, message, location, "eventTime", "createdAt" FROM "TrackingEvent" WHERE "shipmentId" = ${shipment.id}
            ORDER BY "eventTime" ASC
          `;
          trackingEvents = events as typeof trackingEvents;
        }
      } catch {
        // DB query failed — fall back to stored data only
      }
    }

    let liveTracker: {
      carrier?: string;
      status?: string;
      tracking_url_provider?: string;
      tracking_status?: { status: string; status_date?: string };
      tracking_history?: Array<{
        status: string;
        status_details?: string;
        occurred_at?: string;
        location?: { city?: string; state?: string; country?: string };
      }>;
    } | null = null;

    if (process.env.SHIPPO_API_KEY && shipment?.carrier) {
      try {
        const { getTracking } = await import('@/lib/shippo');
        liveTracker = await getTracking({ trackingCode: code, carrier: shipment.carrier });
      } catch {
        // Silently fall back to DB data
      }
    }

    const trackHistory = liveTracker?.tracking_history ?? [];

    return NextResponse.json({
      trackingCode: code,
      carrier: shipment?.carrier ?? liveTracker?.carrier ?? null,
      status: liveTracker?.tracking_status?.status?.toLowerCase() ?? shipment?.status ?? 'unknown',
      trackingUrl: shipment?.trackingUrl ?? liveTracker?.tracking_url_provider ?? null,
      labelUrl: shipment?.labelUrl ?? null,
      estDeliveryDate: liveTracker?.tracking_status?.status_date ?? null,
      order: shipment?.order
        ? {
            orderNumber: shipment.order.orderNumber,
            createdAt: shipment.order.createdAt,
            customerName: shipment.order.customer?.name ?? null,
          }
        : null,
      trackingDetails:
        trackHistory.length > 0
          ? trackHistory.map((d) => ({
              status: d.status?.toLowerCase() ?? 'unknown',
              message: d.status_details ?? d.status ?? null,
              datetime: d.occurred_at ?? null,
              location: d.location
                ? [d.location.city, d.location.state, d.location.country].filter(Boolean).join(', ')
                : null,
            }))
          : trackingEvents.map((e) => ({
              status: e.status,
              message: e.message,
              datetime: e.eventTime?.toISOString() ?? e.createdAt.toISOString(),
              location: e.location,
            })),
    });
  } catch (error) {
    console.error('[TRACK] Error:', error);
    return NextResponse.json(
      { error: 'Unable to retrieve tracking information' },
      { status: 500 }
    );
  }
}
