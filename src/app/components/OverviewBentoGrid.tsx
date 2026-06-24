'use client';

import React from 'react';
import { useDashboardKPIs } from '@/hooks/useAnalytics';
import MetricCard from '@/components/ui/MetricCard';
import { ShoppingCart, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';

export default function OverviewBentoGrid() {
  const { data: kpis, isLoading } = useDashboardKPIs();

  const todayGMV = kpis?.totalRevenue ?? 0;
  const totalOrders = kpis?.totalOrders ?? 0;
  const failedPayments = kpis?.failedPayments ?? 0;
  const avgOrderValue = kpis?.avgOrderValue ?? 0;
  const activeSubscriptions = kpis?.activeSubscriptions ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      {/* Hero — GMV */}
      <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-2 2xl:col-span-2">
        <MetricCard
          label="Total Revenue"
          value={isLoading ? '—' : `$${(todayGMV / 1000)?.toFixed(1)}k`}
          subValue="Last 30 days"
          trend={32}
          trendLabel="vs prev period"
          icon={DollarSign}
          variant="success"
          className="h-full"
        />
      </div>
      <MetricCard
        label="Total Orders"
        value={isLoading ? '—' : String(totalOrders)}
        subValue={`${activeSubscriptions} subscriptions active`}
        trend={18}
        trendLabel="vs prev period"
        icon={ShoppingCart}
      />
      <MetricCard
        label="Failed Payments"
        value={isLoading ? '—' : String(failedPayments)}
        subValue={failedPayments > 0 ? 'Retry queued' : 'All clear'}
        icon={RefreshCw}
        variant={failedPayments > 0 ? 'alert' : undefined}
      />
      <MetricCard
        label="Avg Order Value"
        value={isLoading ? '—' : `$${avgOrderValue?.toFixed(2)}`}
        subValue="Last 30 days"
        trend={7}
        trendLabel="vs prev period"
        icon={TrendingUp}
      />
    </div>
  );
}