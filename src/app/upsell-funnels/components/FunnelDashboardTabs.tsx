'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Link2,
  Award,
  Crown,
  Medal,
  Download,
  FileText,
  BarChart3,
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
} from 'lucide-react';

interface FunnelDashboardTabsProps {
  funnels: Array<{ id: string; name: string; is_active: boolean }>;
  storeId?: string;
}

type TabId = 'sales' | 'manage-coupons' | 'affiliate-performance' | 'affiliate-signup-tools' | 'manage-affiliates' | 'affiliate-leaderboard' | 'checkout-links';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'sales', label: 'Sales' },
  { id: 'manage-coupons', label: 'Manage Coupons' },
  { id: 'affiliate-performance', label: 'Affiliate Performance' },
  { id: 'affiliate-signup-tools', label: 'Affiliate Signup Tools' },
  { id: 'manage-affiliates', label: 'Manage Affiliates' },
  { id: 'affiliate-leaderboard', label: 'Affiliate Leaderboard' },
  { id: 'checkout-links', label: 'Checkout Links' },
];

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: string;
  product: string;
  amountCents: number;
  amountDisplay: string;
  date: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

interface AffiliateRow {
  id: string;
  name: string;
  clicks: number;
  conversions: number;
  revenue: number;
  epc: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  totalSales: number;
  totalRevenue: number;
}

interface StoreResponse {
  templates: Array<{ id: string }>;
}

export default function FunnelDashboardTabs({ funnels, storeId: propStoreId }: FunnelDashboardTabsProps) {
  const [tab, setTab] = useState<TabId>('sales');
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [salesTotalRevenue, setSalesTotalRevenue] = useState(0);
  const [salesError, setSalesError] = useState<string | null>(null);

  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [affiliateError, setAffiliateError] = useState<string | null>(null);

  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const [copied, setCopied] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string>(propStoreId ?? '');

  useEffect(() => {
    if (propStoreId) {
      setStoreId(propStoreId);
      return;
    }
    let cancelled = false;
    const fetchStore = async () => {
      try {
        const res = await fetch('/api/storefront');
        const json = (await res.json()) as StoreResponse;
        if (!cancelled && Array.isArray(json.templates) && json.templates.length > 0) {
          setStoreId(String(json.templates[0].id));
        } else if (!cancelled) {
          setStoreId('');
        }
      } catch {
        if (!cancelled) setStoreId('');
      }
    };
    fetchStore();
    return () => {
      cancelled = true;
    };
  }, [propStoreId]);

  useEffect(() => {
    if (tab === 'sales') {
      let cancelled = false;
      const fetchSales = async () => {
        try {
          setSalesLoading(true);
          setSalesError(null);
          const res = await fetch('/api/orders?limit=25');
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Failed to load orders');
          const orders: Array<Record<string, unknown>> = json.orders ?? [];
          let total = 0;
          const mapped: SalesOrder[] = orders.map((o) => {
            const amountCents = typeof o.total === 'number' ? o.total : 0;
            total += amountCents;
            return {
              id: o.id as string,
              orderNumber: String(o.orderNumber ?? o.id ?? ''),
              customer: o.customer
                ? `${(o.customer as { name?: string }).name ?? ''} ${(o.customer as { email?: string }).email ?? ''}`.trim() || '—'
                : '—',
              product: (o.items as Array<{ name?: string }>)?.[0]?.name ?? '—',
              amountCents,
              amountDisplay: `$${(amountCents / 100).toLocaleString()}`,
              date: o.createdAt ? new Date(o.createdAt as string).toLocaleDateString() : '—',
              status: String(o.paymentStatus ?? o.status ?? '—'),
              paymentStatus: String(o.paymentStatus ?? '—'),
              fulfillmentStatus: String(o.fulfillmentStatus ?? '—'),
            };
          });
          if (!cancelled) {
            setSalesOrders(mapped);
            setSalesTotalRevenue(total);
          }
        } catch (err) {
          if (!cancelled) setSalesError(err instanceof Error ? err.message : 'Failed to load orders');
        } finally {
          if (!cancelled) setSalesLoading(false);
        }
      };
      fetchSales();
      return () => {
        cancelled = true;
      };
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'affiliate-performance') {
      let cancelled = false;
      const fetchAffiliatePerformance = async () => {
        try {
          setAffiliateLoading(true);
          setAffiliateError(null);
          const res = await fetch('/api/affiliates?limit=25');
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Failed to load affiliates');
          const mapped: AffiliateRow[] = (json.affiliates ?? []).map((a: Record<string, unknown>) => {
            const clicks = typeof a.clicks === 'number' ? a.clicks : 0;
            const conversions = typeof a.conversions === 'number' ? a.conversions : 0;
            const revenue = typeof a.gmv === 'number' ? a.gmv : 0;
            return {
              id: String(a.id),
              name: String(a.name ?? 'Unknown'),
              clicks,
              conversions,
              revenue,
              epc: clicks > 0 ? revenue / clicks : 0,
            };
          });
          if (!cancelled) setAffiliates(mapped);
        } catch (err) {
          if (!cancelled) setAffiliateError(err instanceof Error ? err.message : 'Failed to load affiliates');
        } finally {
          if (!cancelled) setAffiliateLoading(false);
        }
      };
      fetchAffiliatePerformance();
      return () => {
        cancelled = true;
      };
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'affiliate-leaderboard') {
      let cancelled = false;
      const fetchLeaderboard = async () => {
        try {
          setLeaderboardLoading(true);
          setLeaderboardError(null);
          const res = await fetch('/api/affiliates?limit=10&sort=revenue');
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Failed to load leaderboard');
          const mapped: LeaderboardEntry[] = (json.affiliates ?? []).map((a: Record<string, unknown>) => ({
            id: String(a.id),
            name: String(a.name ?? 'Unknown'),
            totalSales: typeof a.conversions === 'number' ? a.conversions : 0,
            totalRevenue: typeof a.gmv === 'number' ? a.gmv : 0,
          }));
          if (!cancelled) setLeaderboard(mapped);
        } catch (err) {
          if (!cancelled) setLeaderboardError(err instanceof Error ? err.message : 'Failed to load leaderboard');
        } finally {
          if (!cancelled) setLeaderboardLoading(false);
        }
      };
      fetchLeaderboard();
      return () => {
        cancelled = true;
      };
    }
  }, [tab]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1800);
  };

  const getCheckoutUrl = (funnelId: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/checkout?storeId=${encodeURIComponent(storeId)}&funnelId=${encodeURIComponent(funnelId)}`;
  const getUpsellUrl = (funnelId: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/upsell?funnelId=${encodeURIComponent(funnelId)}`;

  const renderSales = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Recent Sales</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Total: ${(salesTotalRevenue / 100).toLocaleString()}
          </span>
        </div>
        <button
          onClick={() => {
            const html = [
              '<table>',
              '  <thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>',
              '  <tbody>',
              ...salesOrders.map((o) => `<tr><td>${o.orderNumber}</td><td>${o.customer}</td><td>${o.product}</td><td>${o.amountDisplay}</td><td>${o.date}</td><td>${o.status}</td></tr>`),
              '  </tbody>',
              '</table>',
            ].join('\n');
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sales-export.html';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download size={12} />
          Export
        </button>
      </div>

      {salesError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">{salesError}</div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {salesLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading orders…
          </div>
        ) : salesOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <BarChart3 size={28} className="opacity-30" />
            <p className="text-sm">No orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {salesOrders.map((o) => {
                  const color =
                    o.paymentStatus === 'succeeded'
                      ? 'text-success'
                      : o.paymentStatus === 'failed' || o.paymentStatus === 'canceled'
                        ? 'text-danger'
                        : 'text-muted-foreground';
                  return (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-secondary-foreground">{o.orderNumber}</code>
                      </td>
                      <td className="px-4 py-3 text-foreground">{o.customer}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.product}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{o.amountDisplay}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.date}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium capitalize ${color}`}>{o.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderManageCoupons = () => {
    const CouponsContent = require('@/app/coupons/components/CouponsPageContent').default;
    return <CouponsContent />;
  };

  const renderAffiliatePerformance = () => (
    <div className="space-y-4">
      {affiliateError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">{affiliateError}</div>}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {affiliateLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading affiliates…
          </div>
        ) : affiliates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Link2 size={28} className="opacity-30" />
            <p className="text-sm">No affiliate performance data yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Affiliate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clicks</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversions</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">EPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{a.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{a.conversions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">${a.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">${a.epc.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderAffiliateSignupTools = () => (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Affiliate Signup Link</h3>
        <p className="text-xs text-muted-foreground">Share this link with potential affiliates to let them sign up directly.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg text-secondary-foreground truncate">
            {typeof window !== 'undefined' ? window.location.origin : ''}/affiliate-portal
          </code>
          <button
            onClick={() => {
              const text = `${typeof window !== 'undefined' ? window.location.origin : ''}/affiliate-portal`;
              copyText(text);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied === 'signup' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            Copy
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Share your signup link with potential affiliates to recruit them.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Promotional Materials</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['Banner Ads', 'Email Swipes', 'Tracking Links'].map((name) => (
            <div key={name} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-5 gap-2">
              <FileText size={22} className="text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">{name}</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderManageAffiliates = () => {
    try {
      const AffiliatesContent = require('@/app/affiliates/components/AffiliatesPageContent').default;
      return <AffiliatesContent />;
    } catch {
      return <p className="text-sm text-muted-foreground">Manage Affiliates module is unavailable.</p>;
    }
  };

  const renderAffiliateLeaderboard = () => (
    <div className="space-y-4">
      {leaderboardError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">{leaderboardError}</div>}

      <div className="bg-card border border-border rounded-xl p-5">
        {leaderboardLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading leaderboard…
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Award size={28} className="opacity-30" />
            <p className="text-sm">No affiliations found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, idx) => {
              const rank = idx + 1;
              let RankIcon = null;
              let rankColor = 'text-muted-foreground';
              let bgColor = 'bg-muted';
              if (rank === 1) {
                RankIcon = Crown;
                rankColor = 'text-amber-400';
                bgColor = 'bg-amber-400/10 border-amber-400/30';
              } else if (rank === 2) {
                RankIcon = Medal;
                rankColor = 'text-gray-300';
                bgColor = 'bg-gray-300/10 border-gray-300/30';
              } else if (rank === 3) {
                RankIcon = Award;
                rankColor = 'text-orange-400';
                bgColor = 'bg-orange-400/10 border-orange-400/30';
              }
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${bgColor} ${rankColor}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 shrink-0">
                    {RankIcon ? (
                      <RankIcon size={18} />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{entry.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.totalSales.toLocaleString()} sales · ${entry.totalRevenue.toLocaleString()} revenue
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderCheckoutLinks = () => (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Checkout & Upsell URLs</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Use these to share funnel-specific links.</p>
        </div>

        {funnels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Link2 size={22} className="opacity-30" />
            <p className="text-sm">No funnels configured yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {funnels.map((funnel) => {
              const checkoutUrl = getCheckoutUrl(funnel.id);
              const upsellUrl = getUpsellUrl(funnel.id);
              return (
                <div key={funnel.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{funnel.name}</h4>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${funnel.is_active ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}
                    >
                      {funnel.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg text-secondary-foreground truncate">{checkoutUrl}</code>
                      <button
                        onClick={() => copyText(checkoutUrl)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied === checkoutUrl ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted/60 px-3 py-2 rounded-lg text-secondary-foreground truncate">{upsellUrl}</code>
                      <button
                        onClick={() => copyText(upsellUrl)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied === upsellUrl ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-1 px-4 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'sales' && renderSales()}
        {tab === 'manage-coupons' && renderManageCoupons()}
        {tab === 'affiliate-performance' && renderAffiliatePerformance()}
        {tab === 'affiliate-signup-tools' && renderAffiliateSignupTools()}
        {tab === 'manage-affiliates' && renderManageAffiliates()}
        {tab === 'affiliate-leaderboard' && renderAffiliateLeaderboard()}
        {tab === 'checkout-links' && renderCheckoutLinks()}
      </div>
    </div>
  );
}
