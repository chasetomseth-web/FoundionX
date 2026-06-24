'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TopProduct } from '@/hooks/useAnalytics';

interface ProductCategoryChartProps {
  data?: TopProduct[];
  isLoading?: boolean;
}

export default function ProductCategoryChart({ data = [], isLoading }: ProductCategoryChartProps) {
  const chartData = data.map((p) => ({
    category: p.name?.length > 20 ? p.name.slice(0, 18) + '…' : p.name,
    revenue: typeof p._sum?.total === 'string' ? parseFloat(p._sum.total) : (p._sum?.total ?? 0),
    orders: p._count?.id ?? 0,
  }));

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-40 mb-2" />
        <div className="h-3 bg-muted rounded w-32 mb-6" />
        <div className="h-48 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-5">
        <h3 className="text-sm font-600 text-foreground">Revenue by Product</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Top products by revenue</p>
      </div>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No product data</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Bar dataKey="revenue" fill="#000" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}