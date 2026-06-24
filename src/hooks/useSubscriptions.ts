'use client';

import { useQuery } from '@tanstack/react-query';

export interface LiveSubscription {
  id: string;
  customer: { id: string; name: string | null; email: string };
  planName: string;
  status: string;
  amount: string | number;
  currency: string;
  interval: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  stripeCustomerId?: string | null;
  failedAttempts?: number;
  totalPaid?: string | number;
  canceledAt?: string | null;
  invoices?: Array<{ id: string; status: string; amount: string | number; createdAt: string }>;
  createdAt: string;
}

export interface SubscriptionsResponse {
  subscriptions: LiveSubscription[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SubscriptionKPIs {
  mrr: number;
  arr: number;
  activeCount: number;
  pastDue: number;
  churnRate: number;
  totalSubscriptions: number;
}

interface SubscriptionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

async function fetchSubscriptions(filters: SubscriptionFilters): Promise<SubscriptionsResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);

  const res = await fetch(`/api/subscriptions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch subscriptions');
  return res.json();
}

async function fetchSubscriptionKPIs(): Promise<SubscriptionKPIs> {
  const res = await fetch('/api/analytics?type=subscriptions');
  if (!res.ok) throw new Error('Failed to fetch subscription KPIs');
  const data = await res.json();
  return {
    mrr: data.kpis?.mrr ?? 0,
    arr: data.kpis?.arr ?? 0,
    activeCount: data.kpis?.activeSubscriptions ?? 0,
    pastDue: data.kpis?.pastDueSubscriptions ?? 0,
    churnRate: data.kpis?.churnRate ?? 0,
    totalSubscriptions: data.kpis?.totalSubscriptions ?? 0,
  };
}

export function useSubscriptions(filters: SubscriptionFilters = {}) {
  return useQuery({
    queryKey: ['subscriptions', filters],
    queryFn: () => fetchSubscriptions(filters),
    refetchInterval: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useSubscriptionKPIs() {
  return useQuery({
    queryKey: ['subscription-kpis'],
    queryFn: fetchSubscriptionKPIs,
    refetchInterval: 2 * 60 * 1000,
  });
}
