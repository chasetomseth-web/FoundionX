'use client';

import React, { useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Repeat2, DollarSign, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { useSubscriptions, type LiveSubscription } from '@/hooks/useSubscriptions';
import BackButton from '@/components/ui/back-button';

const statusColors: Record<string, string> = {
  active: 'bg-success-bg text-success',
  past_due: 'bg-danger-bg text-danger',
  canceled: 'bg-muted text-muted-foreground',
  trialing: 'bg-info-bg text-info',
  paused: 'bg-warning-bg text-warning',
};

export default function SubscriptionsPageContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useSubscriptions({
    page,
    limit: 25,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const subscriptions = data?.subscriptions ?? [];
  const total = data?.total ?? 0;

  // Compute KPIs from live data
  const mrr = subscriptions
    .filter((s) => s.status === 'active' && s.interval === 'monthly')
    .reduce((sum, s) => sum + (typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount ?? 0)), 0);
  const arr = subscriptions
    .filter((s) => s.status === 'active' && s.interval === 'annual')
    .reduce((sum, s) => sum + (typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount ?? 0)), 0);
  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const pastDue = subscriptions.filter((s) => s.status === 'past_due').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {isLoading ? 'Loading…' : `${total} subscriptions · Stripe-synced`}
            {isFetching && !isLoading && <RefreshCw size={10} className="animate-spin text-primary" />}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="MRR" value={isLoading ? '—' : `$${mrr.toLocaleString()}`} subValue="Monthly recurring" trend={12} trendLabel="vs last month" icon={DollarSign} variant="success" />
        <MetricCard label="ARR" value={isLoading ? '—' : `$${arr.toLocaleString()}`} subValue="Annual recurring" icon={Repeat2} />
        <MetricCard label="Active Subs" value={isLoading ? '—' : String(activeCount)} subValue={`${total} total`} icon={RefreshCw} />
        <MetricCard label="Past Due" value={isLoading ? '—' : String(pastDue)} subValue="Requires recovery action" icon={AlertTriangle} variant="warning" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 flex-1 min-w-48">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search subscriptions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="trialing">Trialing</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Interval</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Next Billing</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Total Paid</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Stripe ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => {
                  const amount = typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount ?? 0);
                  const totalPaid = typeof s.totalPaid === 'string' ? parseFloat(s.totalPaid as string) : (s.totalPaid ?? 0);
                  const nextBilling = s.currentPeriodEnd
                    ? new Date(s.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-500 text-foreground">{s.customer?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{s.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">{s.planName}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-500 text-foreground">${amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-500 bg-muted text-muted-foreground">{s.interval}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-foreground">{nextBilling}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">${totalPaid.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${statusColors[s.status] ?? 'bg-muted text-muted-foreground'}`}>
                            {s.status?.replace('_', ' ')}
                          </span>
                          {(s.failedAttempts ?? 0) > 0 && (
                            <span className="text-xs text-danger font-500">{s.failedAttempts} failed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted-foreground">{s.stripeSubscriptionId ?? '—'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {!isLoading && data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {page} of {data.pages}</p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 px-3 rounded border border-border text-xs font-500 disabled:opacity-40 hover:bg-muted transition-colors">Previous</button>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="h-7 px-3 rounded border border-border text-xs font-500 disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
