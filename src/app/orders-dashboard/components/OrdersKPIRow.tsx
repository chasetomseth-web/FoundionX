import React from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { ShoppingCart, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import type { OrdersKPIs } from '@/hooks/useOrders';

interface OrdersKPIRowProps {
  kpiData?: OrdersKPIs;
  isLoading?: boolean;
}

export default function OrdersKPIRow({ kpiData, isLoading }: OrdersKPIRowProps) {
  const totalRevenue = kpiData?.totalRevenue ?? 0;
  const totalOrders = kpiData?.totalOrders ?? 0;
  const avgOrderValue = kpiData?.avgOrderValue ?? 0;
  const failedPayments = kpiData?.failedPayments ?? 0;
  const pendingFulfillment = kpiData?.pendingFulfillment ?? 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
            <div className="h-3 bg-muted rounded w-24 mb-3" />
            <div className="h-7 bg-muted rounded w-20 mb-2" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Revenue"
        value={`$${(totalRevenue / 1000).toFixed(1)}k`}
        subValue="Paid orders"
        trend={12}
        trendLabel="vs last month"
        icon={DollarSign}
        variant="success"
      />
      <MetricCard
        label="Total Orders"
        value={String(totalOrders)}
        subValue={`${pendingFulfillment} pending fulfillment`}
        icon={ShoppingCart}
      />
      <MetricCard
        label="Avg Order Value"
        value={`$${avgOrderValue.toFixed(2)}`}
        subValue="All time"
        trend={7}
        trendLabel="vs last month"
        icon={TrendingUp}
      />
      <MetricCard
        label="Failed Payments"
        value={String(failedPayments)}
        subValue="Requires recovery"
        icon={RefreshCw}
        variant={failedPayments > 0 ? 'alert' : undefined}
      />
    </div>
  );
}