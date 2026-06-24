export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  inventory: number;
  category: string;
  status: 'active' | 'draft' | 'archived';
  type: 'physical' | 'digital' | 'subscription';
  images: string[];
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  sales: number;
  revenue: number;
  hasUpsell: boolean;
  hasOrderBump: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  status: 'active' | 'draft';
}

export const mockProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Signature Bundle',
    sku: 'SIG-BNDL-001',
    price: 94.5,
    compareAtPrice: 129.0,
    inventory: 248,
    category: 'Bundles',
    status: 'active',
    type: 'physical',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'],
    description: 'Our flagship bundle combining premium products for maximum value.',
    tags: ['bestseller', 'bundle', 'physical'],
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-05-20T08:30:00Z',
    sales: 312,
    revenue: 29484,
    hasUpsell: true,
    hasOrderBump: true,
  },
  {
    id: 'prod-002',
    name: 'Premium Membership',
    sku: 'PREM-MEM-001',
    price: 49.0,
    compareAtPrice: null,
    inventory: 999,
    category: 'Memberships',
    status: 'active',
    type: 'subscription',
    images: ['https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop'],
    description: 'Monthly recurring membership with exclusive access to all premium content.',
    tags: ['subscription', 'membership', 'recurring'],
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-05-18T12:00:00Z',
    sales: 386,
    revenue: 18914,
    hasUpsell: true,
    hasOrderBump: false,
  },
  {
    id: 'prod-003',
    name: 'Pro Plan Annual',
    sku: 'PRO-ANN-001',
    price: 299.0,
    compareAtPrice: 399.0,
    inventory: 999,
    category: 'Plans',
    status: 'active',
    type: 'subscription',
    images: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop'],
    description: 'Full-featured annual plan with all tools and priority support.',
    tags: ['annual', 'pro', 'subscription'],
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-05-15T09:00:00Z',
    sales: 76,
    revenue: 22724,
    hasUpsell: false,
    hasOrderBump: true,
  },
  {
    id: 'prod-004',
    name: 'Growth Bundle',
    sku: 'GRW-BNDL-001',
    price: 137.5,
    compareAtPrice: 189.0,
    inventory: 142,
    category: 'Bundles',
    status: 'active',
    type: 'physical',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop'],
    description: 'Curated growth-focused bundle for scaling businesses.',
    tags: ['bundle', 'growth', 'physical'],
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-05-19T14:00:00Z',
    sales: 108,
    revenue: 14850,
    hasUpsell: true,
    hasOrderBump: true,
  },
  {
    id: 'prod-005',
    name: 'Starter Kit',
    sku: 'STR-KIT-001',
    price: 67.5,
    compareAtPrice: 89.0,
    inventory: 89,
    category: 'Kits',
    status: 'active',
    type: 'physical',
    images: ['https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=400&fit=crop'],
    description: 'Everything you need to get started quickly.',
    tags: ['starter', 'kit', 'beginner'],
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-05-10T11:00:00Z',
    sales: 93,
    revenue: 6277,
    hasUpsell: false,
    hasOrderBump: false,
  },
  {
    id: 'prod-006',
    name: 'Essential Plan',
    sku: 'ESS-PLN-001',
    price: 39.0,
    compareAtPrice: null,
    inventory: 999,
    category: 'Plans',
    status: 'active',
    type: 'subscription',
    images: ['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=400&fit=crop'],
    description: 'Core features for growing businesses at an accessible price.',
    tags: ['essential', 'monthly', 'subscription'],
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-05-12T10:00:00Z',
    sales: 223,
    revenue: 8697,
    hasUpsell: false,
    hasOrderBump: false,
  },
  {
    id: 'prod-007',
    name: 'Deluxe Pack',
    sku: 'DLX-PCK-001',
    price: 124.0,
    compareAtPrice: 159.0,
    inventory: 34,
    category: 'Bundles',
    status: 'active',
    type: 'physical',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop'],
    description: 'Premium deluxe pack with exclusive items and priority shipping.',
    tags: ['deluxe', 'premium', 'physical'],
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-05-21T09:00:00Z',
    sales: 92,
    revenue: 11408,
    hasUpsell: true,
    hasOrderBump: false,
  },
  {
    id: 'prod-008',
    name: 'Email Mastery Course',
    sku: 'EML-CRS-001',
    price: 197.0,
    compareAtPrice: 297.0,
    inventory: 999,
    category: 'Digital',
    status: 'draft',
    type: 'digital',
    images: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop'],
    description: 'Complete email marketing mastery course — digital download.',
    tags: ['digital', 'course', 'email'],
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    sales: 0,
    revenue: 0,
    hasUpsell: false,
    hasOrderBump: false,
  },
];

export const mockCollections: Collection[] = [
  { id: 'col-001', name: 'All Products', slug: 'all', productCount: 8, status: 'active' },
  { id: 'col-002', name: 'Bundles', slug: 'bundles', productCount: 3, status: 'active' },
  { id: 'col-003', name: 'Memberships & Plans', slug: 'memberships', productCount: 3, status: 'active' },
  { id: 'col-004', name: 'Digital Products', slug: 'digital', productCount: 1, status: 'draft' },
  { id: 'col-005', name: 'Kits', slug: 'kits', productCount: 1, status: 'active' },
];
