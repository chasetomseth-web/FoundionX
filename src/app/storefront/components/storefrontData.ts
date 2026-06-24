export interface StorefrontPage {
  id: string;
  name: string;
  slug: string;
  type: 'homepage' | 'product' | 'collection' | 'checkout' | 'landing' | 'custom';
  status: 'published' | 'draft' | 'archived';
  lastModified: string;
  views: number;
  conversionRate: number;
  htmlSize: number;
}

export const mockStorefrontPages: StorefrontPage[] = [
  {
    id: 'page-001',
    name: 'Homepage',
    slug: '/',
    type: 'homepage',
    status: 'published',
    lastModified: '2026-05-20T14:30:00Z',
    views: 12840,
    conversionRate: 4.9,
    htmlSize: 18.4,
  },
  {
    id: 'page-002',
    name: 'Signature Bundle — Product Page',
    slug: '/products/signature-bundle',
    type: 'product',
    status: 'published',
    lastModified: '2026-05-18T10:00:00Z',
    views: 8420,
    conversionRate: 6.2,
    htmlSize: 22.1,
  },
  {
    id: 'page-003',
    name: 'Premium Membership — Landing',
    slug: '/membership',
    type: 'landing',
    status: 'published',
    lastModified: '2026-05-15T09:00:00Z',
    views: 5210,
    conversionRate: 7.8,
    htmlSize: 31.6,
  },
  {
    id: 'page-004',
    name: 'Checkout — Standard',
    slug: '/checkout',
    type: 'checkout',
    status: 'published',
    lastModified: '2026-05-10T08:00:00Z',
    views: 4102,
    conversionRate: 68.4,
    htmlSize: 14.2,
  },
  {
    id: 'page-005',
    name: 'Flash Sale — May 2026',
    slug: '/sale/may-2026',
    type: 'landing',
    status: 'draft',
    lastModified: '2026-05-22T11:00:00Z',
    views: 0,
    conversionRate: 0,
    htmlSize: 28.9,
  },
  {
    id: 'page-006',
    name: 'All Products Collection',
    slug: '/collections/all',
    type: 'collection',
    status: 'published',
    lastModified: '2026-05-12T10:00:00Z',
    views: 3840,
    conversionRate: 3.1,
    htmlSize: 19.7,
  },
];
