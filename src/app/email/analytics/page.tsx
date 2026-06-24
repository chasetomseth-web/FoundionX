'use client';

import React, { useState, useEffect } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import {
  BarChart2, TrendingUp, Mail, MousePointerClick, AlertTriangle,
  UserMinus, RefreshCw, AlertCircle, Award, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsSummary {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubRate: number;
  totalCampaigns: number;
}

interface TopCampaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  sentAt: string | null;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
}

interface RecentCampaign {
  id: number;
  name: string;
  status: string;
  sentAt: string | null;
  sent: number;
  openRate: number;
}

export default function EmailAnalyticsPageContent() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topCampaigns, setTopCampaigns] = useState<TopCampaign[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/email/analytics');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setSummary(data.summary);
      setTopCampaigns(data.topCampaigns ?? []);
      setRecentCampaigns(data.recentCampaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const chartData = topCampaigns.map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 20) + '…' : c.name,
    openRate: parseFloat(c.openRate.toFixed(1)),
    clickRate: parseFloat(c.clickRate.toFixed(1)),
    sent: c.sent,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Email Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Powered by Brevo campaign data</p>
        </div>
        <button onClick={fetchAnalytics} className="inline-flex items-center gap-2 px-3 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-danger-bg border border-danger/20 rounded-xl p-4 text-sm text-danger">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div><p className="font-600">Brevo Error</p><p className="mt-0.5 text-xs">{error}</p></div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Sent" value={loading ? '—' : (summary?.totalSent ?? 0).toLocaleString()} subValue="All campaigns" icon={Mail} />
        <MetricCard label="Open Rate" value={loading ? '—' : `${summary?.openRate ?? 0}%`} subValue="Avg across campaigns" icon={TrendingUp} variant="success" />
        <MetricCard label="Click Rate" value={loading ? '—' : `${summary?.clickRate ?? 0}%`} subValue="Avg across campaigns" icon={MousePointerClick} />
        <MetricCard label="Bounce Rate" value={loading ? '—' : `${summary?.bounceRate ?? 0}%`} subValue="Hard + soft bounces" icon={AlertTriangle} variant="warning" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Delivered" value={loading ? '—' : (summary?.totalDelivered ?? 0).toLocaleString()} subValue="Successfully delivered" icon={Mail} variant="success" />
        <MetricCard label="Opened" value={loading ? '—' : (summary?.totalOpened ?? 0).toLocaleString()} subValue="Unique opens" icon={BarChart2} />
        <MetricCard label="Clicked" value={loading ? '—' : (summary?.totalClicked ?? 0).toLocaleString()} subValue="Unique clicks" icon={MousePointerClick} />
        <MetricCard label="Unsubscribed" value={loading ? '—' : (summary?.totalUnsubscribed ?? 0).toLocaleString()} subValue={`${summary?.unsubRate ?? 0}% rate`} icon={UserMinus} variant="warning" />
      </div>

      {/* Top Campaigns Chart */}
      {!loading && chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="font-600 text-foreground mb-4 flex items-center gap-2">
            <Award size={16} className="text-primary" />
            Top Campaigns by Open Rate
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} unit="%" />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [`${v}%`, name === 'openRate' ? 'Open Rate' : 'Click Rate']}
              />
              <Bar dataKey="openRate" fill="var(--primary)" radius={[4, 4, 0, 0]} name="openRate" />
              <Bar dataKey="clickRate" fill="var(--success)" radius={[4, 4, 0, 0]} name="clickRate" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Campaigns Table */}
      {!loading && topCampaigns.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Award size={15} className="text-primary" />
            <p className="font-600 text-foreground">Top Performing Campaigns</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Campaign</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Sent</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Open Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Click Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Bounced</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Unsubs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-500 text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{c.sent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={`font-500 ${c.openRate > 20 ? 'text-success' : c.openRate > 10 ? 'text-warning' : 'text-danger'}`}>
                        {c.openRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={`font-500 ${c.clickRate > 3 ? 'text-success' : 'text-foreground'}`}>
                        {c.clickRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{c.bounced}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{c.unsubscribed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {!loading && recentCampaigns.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock size={15} className="text-muted-foreground" />
            <p className="font-600 text-foreground">Recent Campaigns</p>
          </div>
          <div className="divide-y divide-border">
            {recentCampaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-500 text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : 'Not sent'}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Sent</p>
                    <p className="text-sm font-500 text-foreground">{c.sent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Open Rate</p>
                    <p className={`text-sm font-500 ${c.openRate > 20 ? 'text-success' : 'text-foreground'}`}>{c.openRate}%</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-500 ${c.status === 'sent' ? 'bg-info-bg text-info' : c.status === 'draft' ? 'bg-muted text-muted-foreground' : 'bg-success-bg text-success'}`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && topCampaigns.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart2 size={24} className="text-primary" />
          </div>
          <div>
            <p className="font-600 text-foreground">No campaign data yet</p>
            <p className="text-sm text-muted-foreground mt-1">Send your first campaign to see analytics here</p>
          </div>
        </div>
      )}
    </div>
  );
}
