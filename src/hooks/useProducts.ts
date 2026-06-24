'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StripePrice {
  id: string;
  active: boolean;
  currency: string;
  unitAmount: number | null;
  unitAmountDecimal: string | null;
  recurring: { interval: string; intervalCount: number } | null;
  nickname: string | null;
  type: string;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  images: string[];
  metadata: Record<string, string>;
  created: number;
  updated: number;
  defaultPriceId: string | null;
  prices: StripePrice[];
  price: number | null;
  currency: string;
  priceId: string | null;
  isRecurring: boolean;
  interval: string | null;
}

export interface StripeProductsResponse {
  products: StripeProduct[];
  total: number;
}

// Legacy shape kept for compatibility with existing table/panel components
export interface LiveProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: string | number;
  compareAtPrice: string | number | null;
  type: string;
  status: string;
  hasUpsell: boolean;
  hasOrderBump: boolean;
  description?: string | null;
  images: Array<{ url: string; altText: string | null }>;
  inventory: Array<{ quantity: number; available: number; sku?: string | null }>;
  tags: Array<{ tag: string }>;
  collections?: Array<{ collection: { id: string; name: string } }>;
  createdAt: string;
  updatedAt: string;
  _count?: { orderItems: number };
  // Stripe-specific extras
  stripeId?: string;
  stripePrice?: number | null;
  stripePriceId?: string | null;
  stripeCurrency?: string;
  stripeActive?: boolean;
  stripePrices?: StripePrice[];
  isRecurring?: boolean;
  interval?: string | null;
  metadata?: Record<string, string>;
  inventoryQuantity?: number | null;
}

export interface ProductsResponse {
  products: LiveProduct[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  includeArchived?: boolean;
}

/** Convert a Stripe product into the LiveProduct shape used by existing UI */
function stripeToLiveProduct(p: StripeProduct): LiveProduct {
  const inventoryQty = p.metadata?.inventory != null ? parseInt(p.metadata.inventory, 10) : null;
  return {
    id: p.id,
    name: p.name,
    slug: p.id,
    sku: p.metadata?.sku ?? null,
    price: p.price ?? 0,
    compareAtPrice: null,
    type: p.isRecurring ? 'subscription' : 'physical',
    status: p.active ? 'active' : 'archived',
    hasUpsell: false,
    hasOrderBump: false,
    description: p.description ?? '',
    images: p.images.map((url) => ({ url, altText: p.name })),
    inventory: [],
    tags: [],
    collections: [],
    createdAt: new Date(p.created * 1000).toISOString(),
    updatedAt: new Date(p.updated * 1000).toISOString(),
    _count: { orderItems: 0 },
    // Stripe extras
    stripeId: p.id,
    stripePrice: p.price,
    stripePriceId: p.priceId,
    stripeCurrency: p.currency,
    stripeActive: p.active,
    stripePrices: p.prices,
    isRecurring: p.isRecurring,
    interval: p.interval,
    metadata: p.metadata,
    inventoryQuantity: isNaN(inventoryQty as number) ? null : inventoryQty,
  };
}

async function fetchStripeProducts(filters: ProductFilters): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status === 'active') params.set('active', 'true');

  const res = await fetch(`/api/stripe/products?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to fetch Stripe products');
  }
  const data: StripeProductsResponse = await res.json();

  // Client-side pagination
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  let products = data.products.map(stripeToLiveProduct);

  // Filter archived products unless includeArchived is true
  if (!filters.includeArchived) {
    products = products.filter((p) => p.status !== 'archived');
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    products = products.filter((p) => p.status === filters.status);
  }
  // Type filter
  if (filters.type && filters.type !== 'all') {
    products = products.filter((p) => p.type === filters.type);
  }

  const total = products.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const paginated = products.slice((page - 1) * limit, page * limit);

  return { products: paginated, total, page, limit, pages };
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['stripe-products', filters],
    queryFn: () => fetchStripeProducts(filters),
    refetchInterval: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useProductKPIs() {
  return useQuery({
    queryKey: ['stripe-product-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/stripe/products');
      if (!res.ok) return { activeCount: 0, totalRevenue: 0, lowStock: 0, draftCount: 0 };
      const data: StripeProductsResponse = await res.json();
      return {
        activeCount: data.products.filter((p) => p.active).length,
        totalRevenue: 0,
        lowStock: 0,
        draftCount: data.products.filter((p) => !p.active).length,
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/stripe/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to update product in Stripe');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-products'] });
      queryClient.invalidateQueries({ queryKey: ['stripe-product-kpis'] });
    },
  });
}

export function usePatchProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/stripe/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to patch product in Stripe');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-products'] });
      queryClient.invalidateQueries({ queryKey: ['stripe-product-kpis'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, permanent }: { id: string; permanent?: boolean }) => {
      const params = permanent ? '?permanent=true' : '';
      const res = await fetch(`/api/stripe/products/${id}${params}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? (permanent ? 'Failed to permanently delete product' : 'Failed to archive product in Stripe'));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-products'] });
      queryClient.invalidateQueries({ queryKey: ['stripe-product-kpis'] });
    },
  });
}

export function useCreateStripeProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      price?: number;
      currency?: string;
      recurring?: boolean;
      interval?: string;
      interval_count?: number;
      metadata?: Record<string, string>;
      images?: string[];
      tax_behavior?: 'inclusive' | 'exclusive' | 'unspecified';
      includeTax?: boolean;
    }) => {
      const res = await fetch('/api/stripe/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create product in Stripe');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-products'] });
      queryClient.invalidateQueries({ queryKey: ['stripe-product-kpis'] });
    },
  });
}
