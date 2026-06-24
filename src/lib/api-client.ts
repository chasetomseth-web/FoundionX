/**
 * MerchantOS API Client
 * Typed client for all backend API routes
 * Replaces all mock data with real API calls
 */

// ============================================================
// BASE FETCHER
// ============================================================

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined> }
): Promise<T> {
  let url = path;

  if (options?.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error ?? `API error ${res.status}`);
  }

  return res.json();
}

// ============================================================
// ORDERS
// ============================================================

export interface OrdersResponse {
  orders: ApiOrder[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string | null; email: string } | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: string;
  currency: string;
  stripePaymentIntentId: string | null;
  affiliateCode: string | null;
  isSubscriptionOrder: boolean;
  items: ApiOrderItem[];
  shipments: ApiShipment[];
  refunds: ApiRefund[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: string;
  total: string;
  isUpsell: boolean;
}

export interface ApiShipment {
  id: string;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
}

export interface ApiRefund {
  id: string;
  amount: string;
  status: string;
}

export const ordersApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => apiFetch<OrdersResponse>('/api/orders', { params }),

  get: (id: string) => apiFetch<ApiOrder>(`/api/orders/${id}`),

  update: (id: string, data: Partial<ApiOrder>) =>
    apiFetch<ApiOrder>(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  create: (data: Record<string, unknown>) =>
    apiFetch<ApiOrder>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// PRODUCTS
// ============================================================

export interface ProductsResponse {
  products: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  type: string;
  status: string;
  hasUpsell: boolean;
  hasOrderBump: boolean;
  images: { url: string; altText: string | null }[];
  inventory: { quantity: number; available: number }[];
  tags: { tag: string }[];
  createdAt: string;
  updatedAt: string;
}

export const productsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
  }) => apiFetch<ProductsResponse>('/api/products', { params }),

  get: (id: string) => apiFetch<ApiProduct>(`/api/products/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch<ApiProduct>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<ApiProduct>(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// CUSTOMERS
// ============================================================

export interface CustomersResponse {
  customers: ApiCustomer[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiCustomer {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  tags: string[];
  stripeCustomerId: string | null;
  totalSpent: string;
  totalOrders: number;
  avgOrderValue: string;
  ltv: string;
  lastOrderAt: string | null;
  acceptsMarketing: boolean;
  subscriptions: { status: string; planName: string }[];
  createdAt: string;
}

export const customersApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tag?: string;
  }) => apiFetch<CustomersResponse>('/api/customers', { params }),

  get: (id: string) => apiFetch<ApiCustomer>(`/api/customers/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch<ApiCustomer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<ApiCustomer>(`/api/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// SUBSCRIPTIONS
// ============================================================

export interface SubscriptionsResponse {
  subscriptions: ApiSubscription[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiSubscription {
  id: string;
  customer: { id: string; name: string | null; email: string };
  planName: string;
  status: string;
  amount: string;
  currency: string;
  interval: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  failedPaymentCount: number;
  invoices: { status: string; amount: string; paidAt: string | null }[];
  createdAt: string;
}

export const subscriptionsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => apiFetch<SubscriptionsResponse>('/api/subscriptions', { params }),

  get: (id: string) => apiFetch<ApiSubscription>(`/api/subscriptions/${id}`),
};

// ============================================================
// AFFILIATES
// ============================================================

export interface AffiliatesResponse {
  affiliates: ApiAffiliate[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiAffiliate {
  id: string;
  email: string;
  name: string;
  status: string;
  tier: string;
  referralCode: string;
  commissionRate: string;
  totalEarned: string;
  totalPaid: string;
  pendingBalance: string;
  totalReferrals: number;
  totalConversions: number;
  goaffproAffiliateId: string | null;
  commissions: { amount: string; status: string }[];
  _count: { referrals: number; commissions: number };
  joinedAt: string;
}

export const affiliatesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tier?: string;
  }) => apiFetch<AffiliatesResponse>('/api/affiliates', { params }),

  get: (id: string) => apiFetch<ApiAffiliate>(`/api/affiliates/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch<ApiAffiliate>('/api/affiliates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<ApiAffiliate>(`/api/affiliates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  sync: (storeId: string) =>
    apiFetch('/api/affiliates/sync', {
      method: 'POST',
      body: JSON.stringify({ storeId }),
    }),
};

// ============================================================
// ANALYTICS
// ============================================================

export interface AnalyticsResponse {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalRefunded: number;
    totalCustomers: number;
    mrr: number;
    arr: number;
    activeSubscriptions: number;
    failedPayments: number;
    activeAffiliates: number;
    totalCommissions: number;
    pendingCommissions: number;
  };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: string; name: string; _sum: { total: string }; _count: { id: number } }[];
  subscriptionBreakdown: { status: string; _count: { id: number }; _sum: { amount: string } }[];
  recentOrders: ApiOrder[];
}

export const analyticsApi = {
  get: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiFetch<AnalyticsResponse>('/api/analytics', { params }),
};

// ============================================================
// STOREFRONT
// ============================================================

export interface StorefrontResponse {
  templates: ApiTemplate[];
}

export interface ApiTemplate {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  bindings: string[];
  warnings?: string[];
  uploadedAt: string;
  publishedAt: string | null;
}

export const storefrontApi = {
  list: () => apiFetch<StorefrontResponse>('/api/storefront'),

  upload: (data: { name: string; slug?: string; type?: string; rawHtml: string; cssContent?: string }) =>
    apiFetch<{ template: ApiTemplate; warnings: string[] }>('/api/storefront', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  publish: (id: string) =>
    apiFetch<ApiTemplate>(`/api/storefront/${id}/publish`, { method: 'POST' }),
};

// ============================================================
// EMAIL
// ============================================================

export const emailApi = {
  getCampaigns: () => apiFetch('/api/email/campaigns'),
  triggerAutomation: (event: string, email: string, props?: Record<string, unknown>) =>
    apiFetch('/api/email/trigger', {
      method: 'POST',
      body: JSON.stringify({ event, email, props }),
    }),
};
