'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface LiveAffiliate {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  status: string;
  tier: string;
  commissionRate: number;
  recurringCommission: boolean;
  goaffproId: string | null;
  paypalEmail: string | null;
  totalEarned: string | number;
  pendingBalance: string | number;
  paidOut: string | number;
  clicks: number;
  conversions: number;
  gmv: string | number;
  joinedDate?: string;
  lastConversionDate?: string | null;
  commissions?: Array<{ id: string; amount: string | number; status: string }>;
  _count?: { referrals: number; commissions: number };
  createdAt: string;
}

export interface AffiliatesResponse {
  affiliates: LiveAffiliate[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  source?: 'goaffpro' | 'db' | 'none';
}

export interface AffiliateKPIs {
  activeCount: number;
  totalGMV: number;
  totalCommissions: number;
  pendingPayouts: number;
  totalAffiliates: number;
}

interface AffiliateFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tier?: string;
}

async function fetchAffiliates(filters: AffiliateFilters): Promise<AffiliatesResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.tier) params.set('tier', filters.tier);

  const res = await fetch(`/api/affiliates?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch affiliates');
  return res.json();
}

async function fetchAffiliateKPIs(): Promise<AffiliateKPIs> {
  const res = await fetch('/api/analytics?type=affiliates');
  if (!res.ok) throw new Error('Failed to fetch affiliate KPIs');
  const data = await res.json();
  return {
    activeCount: data.kpis?.activeAffiliates ?? 0,
    totalGMV: data.kpis?.affiliateGMV ?? 0,
    totalCommissions: data.kpis?.totalCommissions ?? 0,
    pendingPayouts: data.kpis?.pendingCommissions ?? 0,
    totalAffiliates: data.kpis?.totalAffiliates ?? 0,
  };
}

async function syncAffiliates(): Promise<{ synced: number }> {
  const res = await fetch('/api/affiliates/sync', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to sync affiliates');
  return res.json();
}

export function useAffiliates(filters: AffiliateFilters = {}) {
  return useQuery({
    queryKey: ['affiliates', filters],
    queryFn: () => fetchAffiliates(filters),
    refetchInterval: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useAffiliateKPIs() {
  return useQuery({
    queryKey: ['affiliate-kpis'],
    queryFn: fetchAffiliateKPIs,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useSyncAffiliates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncAffiliates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-kpis'] });
    },
  });
}
