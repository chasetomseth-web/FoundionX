'use client';

import { useQuery } from '@tanstack/react-query';

export interface AnalyticsKPIs {
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
}

export interface RevenueByDay {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string | null;
  name: string;
  _sum: { total: string | number | null };
  _count: { id: number };
}

export interface SubscriptionBreakdown {
  status: string;
  _count: { id: number };
  _sum: { amount: string | number | null };
}

export interface AnalyticsResponse {
  kpis: AnalyticsKPIs;
  revenueByDay: RevenueByDay[];
  topProducts: TopProduct[];
  subscriptionBreakdown: SubscriptionBreakdown[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customer: { name: string | null; email: string } | null;
    total: string | number;
    paymentStatus: string;
    fulfillmentStatus: string;
    createdAt: string;
    items: Array<{ name: string }>;
  }>;
}

async function fetchAnalytics(dateFrom?: string, dateTo?: string): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);

  const res = await fetch(`/api/analytics?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export function useAnalytics(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['analytics', dateFrom, dateTo],
    queryFn: () => fetchAnalytics(dateFrom, dateTo),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => fetchAnalytics(),
    refetchInterval: 60 * 1000,
    select: (data) => data.kpis,
  });
}
