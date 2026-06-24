'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RefreshCw, TrendingUp, Users, DollarSign, MousePointerClick } from 'lucide-react';

interface AffiliateAnalyticsData {
  summary: {
    totalAffiliates: number;
    activeAffiliates: number;
    pendingAffiliates: number;
    totalClicks: number;
    totalConversions: number;
    totalCommission: number;
    pendingCommission: number;
    approvedCommission: number;
    paidCommission: number;
    conversionRate: number;
  };
  clicksByDay: Array<{ date: string; clicks: number }>;
  commissionsByDay: Array<{ date: string; amount: number; count: number }>;
  topAffiliates: Array<{
    id: string;
    name: string;
    referralCode: string;
    clicks: number;
    totalConversions: number;
    totalEarned: number;
    pendingBalance: number;
    conversionRate: number;
  }>;
  attribution: {
    affiliateOrders: number;
    organicOrders: number;
    totalOrders: number;
    affiliateRevenue: number;
    organicRevenue: number;
    totalRevenue: number;
    affiliatePct: number;
  };
}

interface LiabilityData {
  summary: {
    pending: { amount: number; count: number };
    approved: { amount: number; count: number };
    paid: { amount: number; count: number };
    totalLiability: number;
  };
  perAffiliate: Array<{
    id: string;
    name: string;
    paypalEmail: string | null;
    pendingBalance: number;
    payoutThreshold: number;
    totalOwed: number;
    aboveThreshold: boolean;
    commissionCount: number;
  }>;
  monthlyTrend: Array<{ month: string; pending: number; approved: number; paid: number }>;
}

export default function AffiliateAnalyticsPanel({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const [data, setData] = useState<AffiliateAnalyticsData | null>(null);
  const [liability, setLiability] = useState<LiabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'performance' | 'liability'>('performance');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const [affRes, liabRes] = await Promise.all([
      fetch(`/api/analytics/affiliates?${params}`),
      fetch('/api/analytics/commission-liability'),
    ]);

    const [affData, liabData] = await Promise.all([affRes.json(), liabRes.json()]);

    setData(affData);
    setLiability(liabData);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-48 mb-2" />
        <div className="h-3 bg-muted rounded w-64 mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-muted rounded" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, clicksByDay, commissionsByDay, topAffiliates, attribution } = data;

  // Merge clicks and commissions by date for combo chart
  const allDates = Array.from(
    new Set([
      ...clicksByDay.map((d) => d.date),
      ...commissionsByDay.map((d) => d.date),
    ]),
  ).sort();

  const comboData = allDates.map((date) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clicks: clicksByDay.find((d) => d.date === date)?.clicks ?? 0,
    commission: commissionsByDay.find((d) => d.date === date)?.amount ?? 0,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-600 text-foreground">Affiliate Analytics</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Performance, attribution, and commission liability</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            {(['performance', 'liability'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`h-7 px-3 rounded-md text-xs font-500 capitalize transition-all ${
                  activeTab === t
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-muted transition-colors"
          >
            <RefreshCw size={13} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {activeTab === 'performance' && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Total Clicks"
              value={summary.totalClicks.toLocaleString()}
              icon={MousePointerClick}
              sub={`${summary.activeAffiliates} active affiliates`}
            />
            <KpiCard
              label="Conversions"
              value={summary.totalConversions.toLocaleString()}
              icon={TrendingUp}
              sub={`${summary.conversionRate.toFixed(1)}% conversion rate`}
              highlight={summary.conversionRate >= 4}
            />
            <KpiCard
              label="Total Commission"
              value={`$${summary.totalCommission.toLocaleString()}`}
              icon={DollarSign}
              sub={`$${summary.pendingCommission.toFixed(0)} pending`}
            />
            <KpiCard
              label="Affiliate Revenue"
              value={`$${attribution.affiliateRevenue.toLocaleString()}`}
              icon={Users}
              sub={`${attribution.affiliatePct.toFixed(1)}% of total revenue`}
              highlight={attribution.affiliatePct > 0}
            />
          </div>

          {/* Clicks + commissions combo chart */}
          {comboData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm font-600 text-foreground mb-1">Clicks & Commissions Over Time</p>
              <p className="text-xs text-muted-foreground mb-4">Daily affiliate clicks and earned commissions</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comboData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="clicks"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="commission"
                    orientation="right"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'commission' ? `$${value.toFixed(2)}` : value.toLocaleString(),
                      name === 'commission' ? 'Commission' : 'Clicks',
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="clicks"
                    dataKey="clicks"
                    fill="hsl(var(--primary))"
                    opacity={0.7}
                    radius={[2, 2, 0, 0]}
                    name="Clicks"
                  />
                  <Bar
                    yAxisId="commission"
                    dataKey="commission"
                    fill="hsl(var(--success))"
                    opacity={0.8}
                    radius={[2, 2, 0, 0]}
                    name="Commission ($)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Attribution breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm font-600 text-foreground mb-4">Revenue Attribution</p>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Affiliate-driven</span>
                    <span className="font-600 text-foreground">{attribution.affiliatePct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${attribution.affiliatePct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="p-3 bg-muted/40 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Affiliate Revenue</p>
                    <p className="text-lg font-700 text-foreground">${attribution.affiliateRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{attribution.affiliateOrders} orders</p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Organic Revenue</p>
                    <p className="text-lg font-700 text-foreground">${attribution.organicRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{attribution.organicOrders} orders</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top affiliates mini table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground">Top Affiliates</p>
              </div>
              <div className="divide-y divide-border">
                {topAffiliates.slice(0, 5).map((aff, idx) => (
                  <div key={aff.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-5 text-xs font-700 text-muted-foreground tabular-nums">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-500 text-foreground truncate">{aff.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {aff.clicks.toLocaleString()} clicks · {aff.conversionRate.toFixed(1)}% CVR
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-700 text-foreground">${Number(aff.totalEarned).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {topAffiliates.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">No affiliate data yet</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'liability' && liability && (
        <>
          {/* Liability summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-xl font-700 text-warning">${liability.summary.pending.amount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{liability.summary.pending.count} commissions</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Approved (owed)</p>
              <p className="text-xl font-700 text-foreground">${liability.summary.approved.amount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{liability.summary.approved.count} commissions</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Liability</p>
              <p className="text-xl font-700 text-foreground">${liability.summary.totalLiability.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">pending + approved</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Paid Out (all time)</p>
              <p className="text-xl font-700 text-success">${liability.summary.paid.amount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{liability.summary.paid.count} commissions</p>
            </div>
          </div>

          {/* Monthly trend chart */}
          {liability.monthlyTrend.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm font-600 text-foreground mb-1">Commission Liability Trend</p>
              <p className="text-xs text-muted-foreground mb-4">Pending vs approved vs paid — last 6 months</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={liability.monthlyTrend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="paid" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.4} name="Paid" />
                  <Area type="monotone" dataKey="approved" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} name="Approved" />
                  <Area type="monotone" dataKey="pending" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.4} name="Pending" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-affiliate liability table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground">Per-Affiliate Liability</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Affiliate', 'PayPal', 'Owed', 'Balance', 'Threshold', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {liability.perAffiliate.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No outstanding liability
                      </td>
                    </tr>
                  ) : (
                    liability.perAffiliate.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-500 text-foreground">{a.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {a.paypalEmail ?? <span className="text-warning">Not set</span>}
                        </td>
                        <td className="px-4 py-3 font-700 text-foreground">${a.totalOwed.toFixed(2)}</td>
                        <td className="px-4 py-3 text-muted-foreground">${a.pendingBalance.toFixed(2)}</td>
                        <td className="px-4 py-3 text-muted-foreground">${a.payoutThreshold.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-500 ${
                              a.aboveThreshold
                                ? 'bg-success-bg text-success'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {a.aboveThreshold ? 'Eligible' : 'Below threshold'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            highlight ? 'bg-success-bg text-success' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon size={14} />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-700 text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

