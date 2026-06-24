'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SubscriptionBreakdown } from '@/hooks/useAnalytics';

interface SubscriptionHealthChartProps {
  data?: SubscriptionBreakdown[];
  isLoading?: boolean;
}

export default function SubscriptionHealthChart({ data = [], isLoading }: SubscriptionHealthChartProps) {
  const chartData = data.map((s) => ({
    status: s.status?.replace('_', ' ') ?? 'unknown',
    count: s._count?.id ?? 0,
    mrr: typeof s._sum?.amount === 'string' ? parseFloat(s._sum.amount) : (s._sum?.amount ?? 0),
  }));

  const totalActive = data.find((s) => s.status === 'active')?._count?.id ?? 0;
  const totalMRR = data
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (typeof s._sum?.amount === 'string' ? parseFloat(s._sum.amount) : (s._sum?.amount ?? 0)), 0);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-40 mb-2" />
        <div className="h-3 bg-muted rounded w-32 mb-6" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-600 text-foreground">Subscription Health</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Live Stripe subscription breakdown</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-700 text-foreground tabular-nums">${totalMRR.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{totalActive} active subs</p>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No subscription data</div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="count" fill="#000" radius={[4, 4, 0, 0]} name="Subscriptions" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}