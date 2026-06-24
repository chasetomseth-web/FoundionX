export interface Order {
  id: string;
  orderNumber: string;
  customer: { name: string; email: string };
  products: string;
  total: number;
  paymentStatus: 'paid' | 'failed' | 'refunded' | 'pending';
  fulfillmentStatus: 'unfulfilled' | 'processing' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled';
  affiliate: string | null;
  stripeTransactionId: string;
  carrier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  items: number;
  subscriptionOrder: boolean;
}

// Mock data removed — using live DB data via /api/orders
