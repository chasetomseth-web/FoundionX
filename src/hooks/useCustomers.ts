'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface LiveCustomer {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  tags: string[];
  stripeCustomerId: string | null;
  totalSpent: string | number;
  totalOrders: number;
  avgOrderValue: string | number;
  ltv: string | number;
  lastOrderAt: string | null;
  acceptsMarketing: boolean;
  subscriptions: Array<{ status: string; planName: string }>;
  createdAt: string;
  _count?: { orders: number };
}

export interface CustomersResponse {
  customers: LiveCustomer[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CustomersKPIs {
  totalCustomers: number;
  totalLTV: number;
  atRisk: number;
  withSubscriptions: number;
  activeCount: number;
  avgLTV: number;
}

interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tag?: string;
}

async function fetchCustomers(filters: CustomerFilters): Promise<CustomersResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.tag) params.set('tag', filters.tag);

  const res = await fetch(`/api/customers?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

async function fetchCustomerKPIs(): Promise<CustomersKPIs> {
  const res = await fetch('/api/analytics?type=customers');
  if (!res.ok) throw new Error('Failed to fetch customer KPIs');
  const data = await res.json();
  return {
    totalCustomers: data.kpis?.totalCustomers ?? 0,
    totalLTV: data.kpis?.totalRevenue ?? 0,
    atRisk: data.kpis?.atRiskCustomers ?? 0,
    withSubscriptions: data.kpis?.activeSubscriptions ?? 0,
    activeCount: data.kpis?.activeCustomers ?? 0,
    avgLTV: data.kpis?.avgOrderValue ?? 0,
  };
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => fetchCustomers(filters),
    refetchInterval: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useCustomerKPIs() {
  return useQuery({
    queryKey: ['customer-kpis'],
    queryFn: fetchCustomerKPIs,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update customer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-kpis'] });
    },
  });
}
