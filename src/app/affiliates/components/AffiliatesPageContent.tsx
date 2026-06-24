'use client';

import React, { useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Link2, DollarSign, TrendingUp, Users, Search, ExternalLink, Zap, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAffiliates, useSyncAffiliates, type LiveAffiliate } from '@/hooks/useAffiliates';
import AffiliateDetailPanel from './AffiliateDetailPanel';
import type { Affiliate } from './affiliatesData';
import BackButton from '@/components/ui/back-button';


const statusColors: Record<string, string> = {
  active: 'bg-success-bg text-success',
  paused: 'bg-warning-bg text-warning',
  pending: 'bg-info-bg text-info',
  banned: 'bg-danger-bg text-danger',
};

const tierColors: Record<string, string> = {
  standard: 'bg-muted text-muted-foreground',
  silver: 'bg-muted text-secondary-foreground',
  gold: 'bg-warning-bg text-warning',
  platinum: 'bg-primary/10 text-primary',
};

// Adapt LiveAffiliate to legacy Affiliate shape for detail panel
function adaptAffiliate(a: LiveAffiliate): Affiliate {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    code: a.referralCode,
    status: (a.status as Affiliate['status']) ?? 'pending',
    tier: (a.tier as Affiliate['tier']) ?? 'standard',
    commissionRate: typeof a.commissionRate === 'number' ? a.commissionRate * 100 : (a.commissionRate ?? 0),
    clicks: a.clicks ?? 0,
    conversions: a.conversions ?? a._count?.referrals ?? 0,
    conversionRate: a.clicks > 0 ? ((a.conversions ?? 0) / a.clicks) * 100 : 0,
    gmv: typeof a.gmv === 'string' ? parseFloat(a.gmv) : (a.gmv ?? 0),
    commission: typeof a.totalEarned === 'string' ? parseFloat(a.totalEarned) : (a.totalEarned ?? 0),
    pendingPayout: typeof a.pendingBalance === 'string' ? parseFloat(a.pendingBalance) : (a.pendingBalance ?? 0),
    totalPaid: typeof a.paidOut === 'string' ? parseFloat(a.paidOut) : (a.paidOut ?? 0),
    joinedDate: a.createdAt,
    lastConversionDate: a.lastConversionDate ?? null,
    goaffproId: a.goaffproId ?? '',
    paypalEmail: a.paypalEmail ?? null,
    recurringCommissions: a.recurringCommission ?? false,
  };
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
}


export default function AffiliatesPageContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Affiliate | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useAffiliates({
    page,
    limit: 25,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const { mutate: syncAffiliates, isPending: isSyncing } = useSyncAffiliates();

  const affiliates = data?.affiliates ?? [];
  const total = data?.total ?? 0;

  // Compute KPIs
  const totalGMV = affiliates.reduce((s, a) => s + (typeof a.gmv === 'string' ? parseFloat(a.gmv) : (a.gmv ?? 0)), 0);
  const totalCommission = affiliates.reduce((s, a) => s + (typeof a.totalEarned === 'string' ? parseFloat(a.totalEarned) : (a.totalEarned ?? 0)), 0);
  const totalPending = affiliates.reduce((s, a) => s + (typeof a.pendingBalance === 'string' ? parseFloat(a.pendingBalance) : (a.pendingBalance ?? 0)), 0);
  const activeCount = affiliates.filter((a) => a.status === 'active').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Affiliates</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">

            {isLoading ? 'Loading…' : `GoAffPro embedded · ${total} affiliates`}
            {isFetching && !isLoading && <RefreshCw size={10} className="animate-spin text-primary" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-bg border border-success/20 text-success text-xs font-600">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {data?.source === 'goaffpro' ? 'GoAffPro Live' : 'GoAffPro Connected'}
          </div>
          <button
            onClick={() => syncAffiliates()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            Sync
          </button>
          <button
            onClick={() => {
              const code = selected?.code;
              const referralUrl = code
                ? `${window.location.origin}/p/?ref=${encodeURIComponent(code)}`
                : `${window.location.origin}/p/`;

              if (!code) {
                toast.message('Select an affiliate to copy their referral link', { description: 'Click any affiliate row to open details.' });
                return;
              }

              void copyToClipboard(referralUrl);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
            type="button"
          >
            <span className="text-base leading-none">+</span>
            Invite Affiliate
          </button>

        </div>
      </div>

      {/* GoAffPro SDK Banner */}

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Zap size={16} className="text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-600 text-foreground">GoAffPro SDK Active</p>
          <p className="text-xs text-secondary-foreground mt-0.5 leading-relaxed">
            Affiliate tracking script is injected into your storefront. Referral attribution, commission tracking, and payout sync are running in real-time via GoAffPro webhooks.
          </p>
        </div>
        <button className="flex-shrink-0 flex items-center gap-1 text-xs text-primary font-500 hover:opacity-80 transition-opacity">
          SDK Settings <ExternalLink size={10} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Affiliates" value={isLoading ? '—' : String(activeCount)} subValue={`${total} total`} icon={Users} />
        <MetricCard label="Affiliate GMV" value={isLoading ? '—' : `$${(totalGMV / 1000).toFixed(1)}k`} subValue="All time" trend={22} trendLabel="vs last month" icon={TrendingUp} variant="success" />
        <MetricCard label="Total Commissions" value={isLoading ? '—' : `$${(totalCommission / 1000).toFixed(1)}k`} subValue="Earned all time" icon={DollarSign} />
        <MetricCard label="Pending Payouts" value={isLoading ? '—' : `$${totalPending.toLocaleString()}`} subValue="Awaiting disbursement" icon={Link2} variant="warning" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 flex-1 min-w-48">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search affiliates, codes…"
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
          <option value="paused">Paused</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Affiliate</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Tier</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Clicks</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Conv.</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">GMV</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Commission</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Pending</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : affiliates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No affiliates found. Sync with GoAffPro to import affiliates.
                  </td>
                </tr>
              ) : (
                affiliates.map((a) => {
                  const gmv = typeof a.gmv === 'string' ? parseFloat(a.gmv) : (a.gmv ?? 0);
                  const commission = typeof a.totalEarned === 'string' ? parseFloat(a.totalEarned) : (a.totalEarned ?? 0);
                  const pending = typeof a.pendingBalance === 'string' ? parseFloat(a.pendingBalance) : (a.pendingBalance ?? 0);
                  const convRate = a.clicks > 0 ? ((a.conversions ?? 0) / a.clicks) * 100 : 0;

                  return (
                    <tr key={a.id} onClick={() => setSelected(adaptAffiliate(a))} className="hover:bg-muted/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-600 flex-shrink-0">
                            {a.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-500 text-foreground">{a.name}</p>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-secondary-foreground">{a.referralCode}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-500 capitalize ${tierColors[a.tier] ?? 'bg-muted text-muted-foreground'}`}>{a.tier}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{(a.clicks ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{a.conversions ?? a._count?.referrals ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-500 text-foreground">${gmv.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">${commission.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={pending > 0 ? 'text-warning font-500' : 'text-muted-foreground'}>
                          ${pending.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${statusColors[a.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

      {selected && <AffiliateDetailPanel affiliate={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
