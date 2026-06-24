'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { RevenueByDay } from '@/hooks/useAnalytics';

interface GmvChartProps {
  data?: RevenueByDay[];
  isLoading?: boolean;
}

export default function GmvChart({ data = [], isLoading }: GmvChartProps) {
  const chartData = data.map((d) => ({
    date: d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.date,
    gmv: typeof d.revenue === 'number' ? d.revenue : parseFloat(String(d.revenue ?? 0)),
    orders: d.orders,
  }));

  const totalGMV = chartData.reduce((s, d) => s + d.gmv, 0);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-32 mb-2" />
        <div className="h-3 bg-muted rounded w-48 mb-6" />
        <div className="h-48 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-600 text-foreground">Gross Merchandise Value</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {chartData.length > 0 ? `${chartData[0]?.date} – ${chartData[chartData.length - 1]?.date}` : 'No data'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-700 text-foreground tabular-nums">${(totalGMV / 1000).toFixed(1)}k</p>
          <p className="text-xs text-muted-foreground">Period total</p>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No revenue data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'GMV']}
            />
            <Area type="monotone" dataKey="gmv" stroke="#000" strokeWidth={2} fill="url(#gmvGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}