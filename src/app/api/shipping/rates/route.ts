import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { createShipment } from '@/lib/shippo';

// POST /api/shipping/rates — create Shippo shipment and get rates
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { toAddress, fromAddress, parcel } = body;

    if (!toAddress || !fromAddress || !parcel) {
      return NextResponse.json(
        { error: 'toAddress, fromAddress, and parcel are required' },
        { status: 400 }
      );
    }

    if (!process.env.SHIPPO_API_KEY) {
      return NextResponse.json(
        { error: 'Shippo API key not configured. Add SHIPPO_API_KEY to your environment variables.' },
        { status: 503 }
      );
    }

    const shipment = await createShipment({ toAddress, fromAddress, parcel });

    return NextResponse.json({
      shipmentId: shipment.object_id,
      rates: shipment.rates.map((rate) => ({
        id: rate.object_id,
        carrier: rate.provider ?? 'Unknown',
        service: rate.servicelevel?.name ?? 'Standard',
        rate: parseFloat(rate.amount),
        currency: rate.currency,
        deliveryDays: rate.estimated_days ?? null,
      })),
    });
  } catch (error) {
    console.error('[SHIPPING RATES] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get shipping rates' },
      { status: 500 }
    );
  }
}
