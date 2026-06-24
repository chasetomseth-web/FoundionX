export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  usageCount: number;
  usageLimit: number | null;
  status: 'active' | 'expired' | 'disabled';
  expiresAt: string | null;
  minimumOrder: number | null;
  revenue: number;
  createdAt: string;
}

export interface Upsell {
  id: string;
  name: string;
  triggerProduct: string;
  offerProduct: string;
  discountPercent: number;
  type: '1click' | 'order_bump' | 'post_purchase';
  status: 'active' | 'draft' | 'paused';
  impressions: number;
  acceptances: number;
  acceptanceRate: number;
  revenue: number;
}

export const mockCoupons: Coupon[] = [
  {
    id: 'coup-001',
    code: 'LAUNCH20',
    type: 'percentage',
    value: 20,
    usageCount: 142,
    usageLimit: 500,
    status: 'active',
    expiresAt: '2026-06-30T23:59:59Z',
    minimumOrder: 50,
    revenue: 18420,
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'coup-002',
    code: 'SAVE30',
    type: 'fixed',
    value: 30,
    usageCount: 89,
    usageLimit: 200,
    status: 'active',
    expiresAt: '2026-05-31T23:59:59Z',
    minimumOrder: 100,
    revenue: 12400,
    createdAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 'coup-003',
    code: 'FREESHIP',
    type: 'free_shipping',
    value: 0,
    usageCount: 312,
    usageLimit: null,
    status: 'active',
    expiresAt: null,
    minimumOrder: 75,
    revenue: 0,
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'coup-004',
    code: 'FLASH50',
    type: 'percentage',
    value: 50,
    usageCount: 500,
    usageLimit: 500,
    status: 'expired',
    expiresAt: '2026-05-15T23:59:59Z',
    minimumOrder: null,
    revenue: 24800,
    createdAt: '2026-05-14T10:00:00Z',
  },
  {
    id: 'coup-005',
    code: 'AFFILIATE10',
    type: 'percentage',
    value: 10,
    usageCount: 198,
    usageLimit: null,
    status: 'active',
    expiresAt: null,
    minimumOrder: null,
    revenue: 8900,
    createdAt: '2026-01-10T10:00:00Z',
  },
];

export const mockUpsells: Upsell[] = [
  {
    id: 'ups-001',
    name: 'Signature Bundle → Pro Guide',
    triggerProduct: 'Signature Bundle',
    offerProduct: 'Pro Guide (Digital)',
    discountPercent: 40,
    type: '1click',
    status: 'active',
    impressions: 312,
    acceptances: 89,
    acceptanceRate: 28.5,
    revenue: 4628,
  },
  {
    id: 'ups-002',
    name: 'Checkout → Email Mastery Add-on',
    triggerProduct: 'Any order',
    offerProduct: 'Email Mastery Course',
    discountPercent: 30,
    type: 'order_bump',
    status: 'active',
    impressions: 1204,
    acceptances: 241,
    acceptanceRate: 20.0,
    revenue: 27474,
  },
  {
    id: 'ups-003',
    name: 'Premium Membership → VIP Access',
    triggerProduct: 'Premium Membership',
    offerProduct: 'VIP Access Upgrade',
    discountPercent: 25,
    type: 'post_purchase',
    status: 'active',
    impressions: 386,
    acceptances: 62,
    acceptanceRate: 16.1,
    revenue: 3100,
  },
  {
    id: 'ups-004',
    name: 'Starter Kit → Growth Bundle',
    triggerProduct: 'Starter Kit',
    offerProduct: 'Growth Bundle',
    discountPercent: 20,
    type: '1click',
    status: 'draft',
    impressions: 0,
    acceptances: 0,
    acceptanceRate: 0,
    revenue: 0,
  },
];
