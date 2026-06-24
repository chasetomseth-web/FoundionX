'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RefreshCw } from 'lucide-react';

interface ConversionPoint {
  date: string;
  sessions: number;
  completed: number;
  rate: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-600 text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-700 text-foreground tabular-nums">
        {payload[0]?.value?.toFixed(2)}%
      </p>
      <p className="text-xs text-muted-foreground">conversion rate</p>
    </div>
  );
};

export default function ConversionChart({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<ConversionPoint[]>([]);
  const [currentRate, setCurrentRate] = useState(0);
  const [avgRate, setAvgRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/analytics/conversion?${params}`);
      const json = await res.json();
      setData(json.data ?? []);
      setCurrentRate(json.currentRate ?? 0);
      setAvgRate(json.avgRate ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    rate: d.rate,
  }));

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-40 mb-2" />
        <div className="h-3 bg-muted rounded w-56 mb-6" />
        <div className="h-44 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-600 text-foreground">Conversion Rate</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Checkout session completion rate · {avgRate.toFixed(1)}% avg
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error ? (
            <button
              onClick={load}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RefreshCw size={11} /> Retry
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success-bg border border-success/20">
              <span className="text-xs font-600 text-success">
                {currentRate.toFixed(1)}% current
              </span>
            </div>
          )}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
          No checkout data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 'auto']}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={4.0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Target 4%',
                position: 'right',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--success))', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'hsl(var(--success))', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

