import React from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { ShoppingCart, DollarSign, TrendingUp, RefreshCw, Users, Repeat2 } from 'lucide-react';
import type { AnalyticsKPIs } from '@/hooks/useAnalytics';

interface ReportingKPIRowProps {
  kpis?: AnalyticsKPIs;
  isLoading?: boolean;
}

export default function ReportingKPIRow({ kpis, isLoading }: ReportingKPIRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
            <div className="h-3 bg-muted rounded w-20 mb-3" />
            <div className="h-7 bg-muted rounded w-16 mb-2" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  const totalRevenue = kpis?.totalRevenue ?? 0;
  const totalOrders = kpis?.totalOrders ?? 0;
  const avgOrderValue = kpis?.avgOrderValue ?? 0;
  const mrr = kpis?.mrr ?? 0;
  const totalCustomers = kpis?.totalCustomers ?? 0;
  const activeSubscriptions = kpis?.activeSubscriptions ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <MetricCard label="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(1)}k`} subValue="Period" trend={18} trendLabel="vs prev" icon={DollarSign} variant="success" />
      <MetricCard label="Orders" value={String(totalOrders)} subValue="Period" trend={12} trendLabel="vs prev" icon={ShoppingCart} />
      <MetricCard label="AOV" value={`$${avgOrderValue.toFixed(0)}`} subValue="Avg order value" trend={7} trendLabel="vs prev" icon={TrendingUp} />
      <MetricCard label="MRR" value={`$${mrr.toLocaleString()}`} subValue="Monthly recurring" trend={4} trendLabel="vs prev" icon={Repeat2} variant="success" />
      <MetricCard label="Customers" value={String(totalCustomers)} subValue="Total" icon={Users} />
      <MetricCard label="Active Subs" value={String(activeSubscriptions)} subValue="Recurring billing" icon={RefreshCw} />
    </div>
  );
}