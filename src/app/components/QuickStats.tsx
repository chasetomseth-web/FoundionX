'use client';

import React from 'react';
import { useDashboardKPIs } from '@/hooks/useAnalytics';

export default function QuickStats() {
  const { data: kpis, isLoading } = useDashboardKPIs();

  const stats = [
    {
      key: 'qs-mrr',
      label: 'MRR',
      value: isLoading ? '—' : `$${(kpis?.mrr ?? 0)?.toLocaleString()}`,
      sub: 'Monthly recurring',
    },
    {
      key: 'qs-affiliates',
      label: 'Active Affiliates',
      value: isLoading ? '—' : String(kpis?.activeAffiliates ?? 0),
      sub: 'GoAffPro synced',
    },
    {
      key: 'qs-subs',
      label: 'Active Subscriptions',
      value: isLoading ? '—' : String(kpis?.activeSubscriptions ?? 0),
      sub: 'Stripe-synced',
    },
    {
      key: 'qs-customers',
      label: 'Total Customers',
      value: isLoading ? '—' : String(kpis?.totalCustomers ?? 0),
      sub: 'All time',
    },
    {
      key: 'qs-commissions',
      label: 'Commissions',
      value: isLoading ? '—' : `$${(kpis?.totalCommissions ?? 0)?.toLocaleString()}`,
      sub: 'Earned all time',
    },
    {
      key: 'qs-failed',
      label: 'Failed Payments',
      value: isLoading ? '—' : String(kpis?.failedPayments ?? 0),
      sub: kpis?.failedPayments ? 'Needs recovery' : 'All clear',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 2xl:grid-cols-6 gap-3">
      {stats?.map((s) => (
        <div key={s?.key} className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10px] font-600 uppercase tracking-widest text-muted-foreground">{s?.label}</p>
          <p className={`text-lg font-700 text-foreground tabular-nums mt-1 ${isLoading ? 'animate-pulse' : ''}`}>{s?.value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{s?.sub}</p>
        </div>
      ))}
    </div>
  );
}