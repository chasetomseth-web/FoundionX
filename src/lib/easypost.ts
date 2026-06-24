/**
 * EasyPost Shipping Service
 * Handles label creation, rate shopping, and tracking via EasyPost REST API
 */

const EASYPOST_API_BASE = 'https://api.easypost.com/v2';
const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY!;

function getAuthHeader() {
  // EasyPost uses HTTP Basic Auth with API key as username, empty password
  const encoded = Buffer.from(`${EASYPOST_API_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

async function easypostRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${EASYPOST_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`EasyPost API error ${res.status}: ${error}`);
  }

  return res.json();
}

// ============================================================
// TYPES
// ============================================================

export interface EasyPostAddress {
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

export interface EasyPostParcel {
  length?: number;
  width?: number;
  height?: number;
  weight: number; // oz
  predefined_package?: string;
}

export interface EasyPostRate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  currency: string;
  delivery_days: number | null;
  est_delivery_days: number | null;
  shipment_id: string;
}

export interface EasyPostShipment {
  id: string;
  tracking_code: string | null;
  status: string;
  rates: EasyPostRate[];
  selected_rate: EasyPostRate | null;
  postage_label: { label_url: string } | null;
  tracker: { id: string; tracking_code: string; public_url: string } | null;
  tracking_url?: string;
}

export interface EasyPostTracker {
  id: string;
  tracking_code: string;
  status: string;
  carrier: string;
  public_url: string;
  est_delivery_date: string | null;
  tracking_details: Array<{
    message: string;
    status: string;
    datetime: string;
    tracking_location: {
      city: string | null;
      state: string | null;
      country: string | null;
    };
  }>;
}

// ============================================================
// SHIPMENT OPERATIONS
// ============================================================

/**
 * Create a shipment and get available rates
 */
export async function createShipment(params: {
  toAddress: EasyPostAddress;
  fromAddress: EasyPostAddress;
  parcel: EasyPostParcel;
}): Promise<EasyPostShipment> {
  return easypostRequest<EasyPostShipment>('POST', '/shipments', {
    shipment: {
      to_address: params.toAddress,
      from_address: params.fromAddress,
      parcel: params.parcel,
    },
  });
}

/**
 * Buy the cheapest rate for a shipment
 */
export async function buyShipment(
  shipmentId: string,
  rateId: string
): Promise<EasyPostShipment> {
  return easypostRequest<EasyPostShipment>('POST', `/shipments/${shipmentId}/buy`, {
    rate: { id: rateId },
  });
}

/**
 * Get cheapest rate from a list of rates
 */
export function getCheapestRate(rates: EasyPostRate[]): EasyPostRate | null {
  if (!rates || rates.length === 0) return null;
  return rates.slice().sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
}

/**
 * Get a shipment by ID
 */
export async function getShipment(shipmentId: string): Promise<EasyPostShipment> {
  return easypostRequest<EasyPostShipment>('GET', `/shipments/${shipmentId}`);
}

// ============================================================
// TRACKING
// ============================================================

/**
 * Create a tracker for a tracking code (for customer tracking page)
 */
export async function createTracker(params: {
  trackingCode: string;
  carrier?: string;
}): Promise<EasyPostTracker> {
  return easypostRequest<EasyPostTracker>('POST', '/trackers', {
    tracker: {
      tracking_code: params.trackingCode,
      carrier: params.carrier,
    },
  });
}

/**
 * Get a tracker by ID
 */
export async function getTracker(trackerId: string): Promise<EasyPostTracker> {
  return easypostRequest<EasyPostTracker>('GET', `/trackers/${trackerId}`);
}

// ============================================================
// STATUS MAPPING
// ============================================================

export function mapEasyPostStatus(easypostStatus: string): string {
  switch (easypostStatus) {
    case 'pre_transit':
      return 'label_created';
    case 'in_transit':
      return 'shipped';
    case 'out_for_delivery':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'return_to_sender': case'failure': case'error':
      return 'failed';
    default:
      return 'processing';
  }
}

export function mapStatusToFulfillment(mappedStatus: string): string {
  switch (mappedStatus) {
    case 'label_created':
      return 'processing';
    case 'shipped': case'out_for_delivery':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    default:
      return 'processing';
  }
}
