'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface LiveOrder {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string | null; email: string } | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: string | number;
  currency: string;
  stripePaymentIntentId: string | null;
  affiliateCode: string | null;
  isSubscriptionOrder: boolean;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: string | number;
    total: string | number;
    isUpsell: boolean;
    product?: { name: string } | null;
  }>;
  shipments: Array<{
    id: string;
    carrier: string | null;
    trackingNumber: string | null;
    status: string;
  }>;
  refunds: Array<{ id: string; amount: string | number; status: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  orders: LiveOrder[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface OrdersKPIs {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalRefunded: number;
  failedPayments: number;
  pendingFulfillment: number;
}

interface OrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  affiliateId?: string;
  dateFrom?: string;
  dateTo?: string;
}

async function fetchOrders(filters: OrderFilters): Promise<OrdersResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
  if (filters.fulfillmentStatus) params.set('fulfillmentStatus', filters.fulfillmentStatus);
  if (filters.affiliateId) params.set('affiliateId', filters.affiliateId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);

  const res = await fetch(`/api/orders?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to fetch orders');
  }
  return res.json();
}

async function fetchOrderKPIs(): Promise<OrdersKPIs> {
  const res = await fetch('/api/analytics?type=orders');
  if (!res.ok) throw new Error('Failed to fetch order KPIs');
  const data = await res.json();
  return {
    totalRevenue: data.kpis?.totalRevenue ?? 0,
    totalOrders: data.kpis?.totalOrders ?? 0,
    avgOrderValue: data.kpis?.avgOrderValue ?? 0,
    totalRefunded: data.kpis?.totalRefunded ?? 0,
    failedPayments: data.kpis?.failedPayments ?? 0,
    pendingFulfillment: data.kpis?.pendingFulfillment ?? 0,
  };
}

async function updateOrder(id: string, data: Record<string, unknown>): Promise<LiveOrder> {
  const res = await fetch(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update order');
  return res.json();
}

export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
    refetchInterval: 30 * 1000, // poll every 30s
    placeholderData: (prev) => prev,
  });
}

export function useOrderKPIs() {
  return useQuery({
    queryKey: ['order-kpis'],
    queryFn: fetchOrderKPIs,
    refetchInterval: 60 * 1000,
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-kpis'] });
    },
  });
}
