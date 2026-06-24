const SHIPPO_API_BASE = 'https://api.goshippo.com/v1';
const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;

function getAuthHeader() {
  if (!SHIPPO_API_KEY) {
    throw new Error('Shippo API key not configured. Add SHIPPO_API_KEY to your environment variables.');
  }
  const encoded = Buffer.from(`${SHIPPO_API_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

async function shippoRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${SHIPPO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Shippo API error ${res.status}: ${errorText}`);
  }

  return res.json();
}

export interface ShippoAddress {
  name?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShippoParcel {
  length: number;
  width: number;
  height: number;
  weight: number; // oz
}

export interface ShippoRate {
  object_id: string;
  provider?: string;
  servicelevel?: { name?: string };
  amount: string;
  currency: string;
  estimated_days: number | null;
}

export interface ShippoShipment {
  object_id: string;
  rates: ShippoRate[];
}

export interface ShippoTransaction {
  object_id: string;
  tracking_number: string;
  tracking_url_provider: string;
  label_url: string;
  status: string;
  carrier?: string;
  rate?: ShippoRate;
}

export interface ShippoTrackingEvent {
  status: string;
  status_details?: string;
  occurred_at?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface ShippoTracking {
  object_id: string;
  tracking_number: string;
  carrier?: string;
  tracking_status?: {
    status: string;
    status_details?: string;
    status_date?: string;
    status_location?: { city?: string; state?: string; country?: string };
  };
  tracking_history?: ShippoTrackingEvent[];
  tracking_url_provider?: string;
}

export async function createShipment(params: {
  toAddress: ShippoAddress;
  fromAddress: ShippoAddress;
  parcel: ShippoParcel;
}): Promise<ShippoShipment> {
  const body = {
    address_from: {
      ...params.fromAddress,
      object_purpose: 'PURCHASE',
    },
    address_to: {
      ...params.toAddress,
      object_purpose: 'PURCHASE',
    },
    parcels: [
      {
        ...params.parcel,
        distance_unit: 'in',
        mass_unit: 'oz',
      },
    ],
    async: false,
  };

  return shippoRequest<ShippoShipment>('POST', '/shipments/', body);
}

export async function buyShipment(rateId: string): Promise<ShippoTransaction> {
  const body = {
    rate: rateId,
    label_file_type: 'PDF',
    async: false,
  };

  return shippoRequest<ShippoTransaction>('POST', '/transactions/', body);
}

export function getCheapestRate(rates: ShippoRate[]): ShippoRate | null {
  if (!rates || rates.length === 0) return null;
  return rates.slice().sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
}

export async function getTracking(params: { trackingCode: string; carrier: string }): Promise<ShippoTracking> {
  return shippoRequest<ShippoTracking>('GET', `/tracks/${encodeURIComponent(params.carrier)}/${encodeURIComponent(params.trackingCode)}/`);
}

export function mapShippoStatus(shippoStatus: string): string {
  const normalized = shippoStatus?.toString()?.trim()?.toLowerCase() ?? '';
  switch (normalized) {
    case 'pre_transit':
    case 'pre transit':
    case 'label_created':
      return 'label_created';
    case 'transit':
    case 'in_transit':
    case 'in transit':
    case 'shipped':
      return 'shipped';
    case 'out_for_delivery':
    case 'out for delivery':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'returned':
    case 'return_to_sender':
    case 'failure':
    case 'exception':
      return 'failed';
    default:
      return 'processing';
  }
}

export function mapStatusToFulfillment(mappedStatus: string): string {
  switch (mappedStatus) {
    case 'label_created':
      return 'processing';
    case 'shipped':
    case 'out_for_delivery':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    default:
      return 'processing';
  }
}
