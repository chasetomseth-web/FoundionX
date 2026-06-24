'use client';

import React, { useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Mail, Send, MousePointerClick, TrendingUp, Plus, Play, Pause, Search, Zap, RefreshCw, Globe } from 'lucide-react';
import { useEmailCampaigns, useTriggerEmail } from '@/hooks/useEmail';
import { useQueryClient } from '@tanstack/react-query';
import NewCampaignModal from './NewCampaignModal';
import SenderDomainPanel from './SenderDomainPanel';
import BackButton from '@/components/ui/back-button';

const statusColors: Record<string, string> = {
  live: 'bg-success-bg text-success',
  active: 'bg-success-bg text-success',
  sent: 'bg-info-bg text-info',
  draft: 'bg-muted text-muted-foreground',
  paused: 'bg-warning-bg text-warning',
};

const typeColors: Record<string, string> = {
  broadcast: 'bg-primary/10 text-primary',
  automation: 'bg-success-bg text-success',
  transactional: 'bg-info-bg text-info',
};

export default function EmailPageContent() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showDomainPanel, setShowDomainPanel] = useState(false);

  const { data, isLoading, isFetching } = useEmailCampaigns();
  const { mutate: triggerEmail } = useTriggerEmail();
  const queryClient = useQueryClient();

  const campaigns = data?.campaigns ?? [];
  const kpis = data?.kpis;

  const filtered = campaigns.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const liveCount = campaigns.filter((c) => c.status === 'live' || c.status === 'active').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Email & Automation</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {isLoading ? 'Loading…' : `Brevo-powered · ${liveCount} active automations`}
            {isFetching && !isLoading && <RefreshCw size={10} className="animate-spin text-primary" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-bg border border-success/20 text-success text-xs font-600">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Brevo Connected
          </div>
          <button
            onClick={() => setShowDomainPanel(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <Globe size={13} />
            Sender Domain
          </button>
          <button
            onClick={() => setShowNewCampaign(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            New Campaign
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Emails Sent" value={isLoading ? '—' : (kpis?.totalSent ?? 0).toLocaleString()} subValue="All campaigns" icon={Send} />
        <MetricCard label="Open Rate" value={isLoading ? '—' : `${(kpis?.avgOpenRate ?? 0).toFixed(1)}%`} subValue="Avg across all campaigns" trend={3} trendLabel="vs last month" icon={Mail} variant="success" />
        <MetricCard label="Click Rate" value={isLoading ? '—' : `${(kpis?.avgClickRate ?? 0).toFixed(1)}%`} subValue="Avg across all campaigns" icon={MousePointerClick} />
        <MetricCard label="Email Revenue" value={isLoading ? '—' : `$${((kpis?.totalRevenue ?? 0) / 1000).toFixed(1)}k`} subValue="Attributed revenue" trend={15} trendLabel="vs last month" icon={TrendingUp} variant="success" />
      </div>

      {/* Automation triggers info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Zap size={16} className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-600 text-foreground">Behavioral Automation Active</p>
          <p className="text-xs text-secondary-foreground mt-0.5 leading-relaxed">
            Triggers: cart abandonment, purchase confirmation, failed payment, subscription renewal, affiliate signup, re-engagement. All synced via Stripe webhooks → Brevo API.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 flex-1 min-w-48">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none cursor-pointer">
          <option value="all">All Types</option>
          <option value="broadcast">Broadcast</option>
          <option value="automation">Automation</option>
          <option value="transactional">Transactional</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none cursor-pointer">
          <option value="all">All Status</option>
          <option value="live">Live</option>
          <option value="sent">Sent</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      {/* Campaigns Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Trigger</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Sent</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Open %</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Click %</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Revenue</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Actions</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No campaigns found. Connect Brevo to sync campaigns or create a new one.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const openRate = c.recipientCount > 0 ? ((c.openCount / c.recipientCount) * 100).toFixed(1) : '—';
                  const clickRate = c.recipientCount > 0 ? ((c.clickCount / c.recipientCount) * 100).toFixed(1) : '—';
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-500 text-foreground">{c.name}</p>
                        {c.subject && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-500 ${typeColors[c.type] ?? 'bg-muted text-muted-foreground'}`}>{c.type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.trigger ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{c.recipientCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{openRate}{c.recipientCount > 0 ? '%' : ''}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{clickRate}{c.recipientCount > 0 ? '%' : ''}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-500 text-foreground">
                        {(c.revenue ?? 0) > 0 ? `$${(c.revenue ?? 0).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${statusColors[c.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {(c.status === 'live' || c.status === 'active') && (
                            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-warning" title="Pause">
                              <Pause size={12} />
                            </button>
                          )}
                          {c.status === 'paused' && (
                            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-success" title="Resume">
                              <Play size={12} />
                            </button>
                          )}
                          {c.status === 'draft' && (
                            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-success" title="Activate">
                              <Play size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showNewCampaign && (
        <NewCampaignModal
          onClose={() => setShowNewCampaign(false)}
          onSent={() => {
            setShowNewCampaign(false);
            queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
          }}
        />
      )}
      {showDomainPanel && (
        <SenderDomainPanel onClose={() => setShowDomainPanel(false)} />
      )}
    </div>
  );
}
