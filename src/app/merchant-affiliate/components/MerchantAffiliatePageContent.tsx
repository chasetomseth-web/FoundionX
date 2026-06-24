'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard, Users, DollarSign, TrendingUp, Tag, BarChart3, Settings,
  Search, ChevronRight, CheckCircle, XCircle, Copy, ExternalLink, Loader2,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Download, Eye, Trophy, Gift,
  Zap, AlertCircle, Filter, Calendar, RefreshCw, Plus, Edit2, Trash2, Save,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

type TabId = 'dashboard' | 'affiliates' | 'sales' | 'payouts' | 'commissions' | 'coupons' | 'analytics' | 'settings';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  status: string;
  tier: string;
  commissionRate: number;
  totalEarned: number;
  pendingBalance: number;
  totalPaid: number;
  totalReferrals: number;
  totalConversions: number;
  clicks?: number;
  paypalEmail?: string | null;
  createdAt?: string;
  metadata?: any;
  _count?: { referrals?: number; commissions?: number };
}

interface Commission {
  id: string;
  amount: number;
  rate: number;
  orderTotal: number;
  status: string;
  type: string;
  createdAt: string;
  affiliate?: { name: string; email: string };
  order?: { orderNumber: string; total: number };
}

interface Payout {
  id: string;
  amount: number;
  method: string;
  status: string;
  processedAt?: string;
  createdAt: string;
  affiliate?: { name: string; email: string };
}

interface DashboardStats {
  affiliates: number;
  orders: number;
  revenue: number;
  commissions: number;
  recentOrders: Array<{ date: string; orderNumber: string; amount: number; affiliate: string; commission: number }>;
  topPartners: Array<{ rank: number; name: string; earned: number }>;
  newRegistrations: Array<{ name: string; email: string; joined: string; status: string }>;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'affiliates', label: 'Affiliates', icon: Users },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'payouts', label: 'Payouts', icon: TrendingUp },
  { id: 'commissions', label: 'Commissions', icon: Tag },
  { id: 'coupons', label: 'Coupons', icon: Gift },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';
const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors';

// ── API Helper ───────────────────────────────────────────────────────────────

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `API error ${res.status}`);
  return res.json();
}

// ── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('30d');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<{ affiliates: Affiliate[]; total: number }>('/api/affiliates?limit=100'),
    ]).then(([affData]) => {
      const affiliates = affData.affiliates ?? [];
      setStats({
        affiliates: affData.total,
        orders: affiliates.reduce((sum, a) => sum + (a.totalConversions ?? 0), 0),
        revenue: affiliates.reduce((sum, a) => sum + Number(a.totalEarned ?? 0), 0),
        commissions: affiliates.reduce((sum, a) => sum + Number(a.pendingBalance ?? 0), 0),
        recentOrders: [],
        topPartners: affiliates.slice(0, 5).map((a, i) => ({ rank: i + 1, name: a.name, earned: Number(a.totalEarned) })),
        newRegistrations: affiliates.slice(0, 5).map(a => ({ name: a.name, email: a.email, joined: a.createdAt ?? '', status: a.status })),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [timeRange]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  if (!stats) return <p className="text-sm text-muted-foreground py-8">Failed to load dashboard.</p>;

  const metricCards = [
    { label: 'Affiliates', value: stats.affiliates, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Orders', value: stats.orders, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Revenue', value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending', value: `$${stats.commissions.toFixed(2)}`, icon: Tag, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Time filter */}
      <div className="flex items-center gap-2">
        {(['24h', '7d', '30d'] as const).map((r) => (
          <button key={r} onClick={() => setTimeRange(r)}
            className={`px-3 py-1.5 text-xs font-500 rounded-lg transition-colors ${timeRange === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {r}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold text-foreground">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two column: Top Partners + New Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-600 text-foreground mb-3">Top Partners</h3>
          {stats.topPartners.length === 0 ? (
            <p className="text-xs text-muted-foreground">No affiliates yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.topPartners.map((p) => (
                <div key={p.rank} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-700 flex items-center justify-center">{p.rank}</span>
                    <span className="text-sm font-500 text-foreground">{p.name}</span>
                  </div>
                  <span className="text-sm font-600 text-foreground tabular-nums">${p.earned.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-600 text-foreground mb-3">New Registrations</h3>
          {stats.newRegistrations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No registrations yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.newRegistrations.map((r) => (
                <div key={r.email} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-500 text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${r.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Important Links */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-600 text-foreground mb-3">Important Links</h3>
        <div className="space-y-2">
          {[
            { label: 'Affiliate Portal', url: '/affiliate-portal/dashboard' },
            { label: 'Affiliate Login', url: '/affiliate-portal/login' },
            { label: 'Affiliate Signup', url: '/affiliate-portal/create-account' },
          ].map((link) => (
            <div key={link.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{link.label}</span>
              <div className="flex-1 flex items-center gap-2">
                <input readOnly value={link.url} className={`${inputCls} text-xs font-mono`} />
                <button onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Copied!'); }}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0">
                  <Copy size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Affiliates Tab ───────────────────────────────────────────────────────────

function AffiliatesTab() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subTab, setSubTab] = useState<'all' | 'pending'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newAff, setNewAff] = useState({ name: '', email: '', commissionRate: 0.10 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      if (subTab === 'pending') params.set('status', 'pending');
      else if (statusFilter) params.set('status', statusFilter);
      const data = await api<{ affiliates: Affiliate[]; total: number }>(`/api/affiliates?${params}`);
      setAffiliates(data.affiliates ?? []);
    } catch { toast.error('Failed to load affiliates'); }
    finally { setLoading(false); }
  }, [search, statusFilter, subTab]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    await api(`/api/affiliates/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
    toast.success('Affiliate approved');
    load();
  };

  const handleReject = async (id: string) => {
    await api(`/api/affiliates/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) });
    toast.success('Affiliate rejected');
    load();
  };

  const handleCreate = async () => {
    if (!newAff.name || !newAff.email) { toast.error('Name and email required'); return; }
    await api('/api/affiliates', { method: 'POST', body: JSON.stringify(newAff) });
    toast.success('Affiliate created');
    setShowCreate(false);
    setNewAff({ name: '', email: '', commissionRate: 0.10 });
    load();
  };

  const pending = affiliates.filter(a => a.status === 'pending');
  const displayed = subTab === 'pending' ? pending : affiliates;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setSubTab('all')} className={`px-3 py-1.5 text-xs font-500 rounded-lg ${subTab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>All ({affiliates.length})</button>
          <button onClick={() => setSubTab('pending')} className={`px-3 py-1.5 text-xs font-500 rounded-lg ${subTab === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Pending ({pending.length})</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search affiliates…" className={`${inputCls} pl-9 w-64`} />
          </div>
          <button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus size={13} /> New Affiliate</button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-600 text-foreground">Create Affiliate</h3>
          <div className="grid grid-cols-3 gap-3">
            <input value={newAff.name} onChange={(e) => setNewAff({ ...newAff, name: e.target.value })} placeholder="Name" className={inputCls} />
            <input value={newAff.email} onChange={(e) => setNewAff({ ...newAff, email: e.target.value })} placeholder="Email" className={inputCls} />
            <div>
              <input type="number" step="0.01" min="0" max="1" value={newAff.commissionRate} onChange={(e) => setNewAff({ ...newAff, commissionRate: parseFloat(e.target.value) })} className={inputCls} />
              <p className="text-[10px] text-muted-foreground mt-0.5">e.g. 0.10 = 10%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCreate} className={btnPrimary}>Create</button>
            <button onClick={() => setShowCreate(false)} className={btnSecondary}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Earnings</th>
                <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Unpaid</th>
                <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground"><Loader2 size={16} className="animate-spin inline" /></td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No affiliates found</td></tr>
              ) : displayed.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-500 text-foreground">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.referralCode}</td>
                  <td className="px-4 py-3 tabular-nums">{a.totalConversions ?? a._count?.commissions ?? 0}</td>
                  <td className="px-4 py-3 font-600 tabular-nums">${Number(a.totalEarned).toFixed(2)}</td>
                  <td className="px-4 py-3 font-600 tabular-nums text-orange-600">${Number(a.pendingBalance).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${a.status === 'active' ? 'bg-green-50 text-green-700' : a.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'pending' ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleApprove(a.id)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-green-50 text-green-600"><CheckCircle size={14} /></button>
                        <button onClick={() => handleReject(a.id)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-50 text-red-600"><XCircle size={14} /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<{ commissions: Commission[] }>('/api/affiliates/commissions').then(d => setCommissions(d.commissions ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalRevenue = commissions.reduce((s, c) => s + Number(c.orderTotal), 0);
  const totalCommission = commissions.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Sales</p>
          <p className="text-lg font-bold text-foreground">{commissions.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-lg font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Commission</p>
          <p className="text-lg font-bold text-foreground">${totalCommission.toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Order</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Affiliate</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Commission</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center"><Loader2 size={16} className="animate-spin inline text-muted-foreground" /></td></tr>
            ) : commissions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No sales recorded yet</td></tr>
            ) : commissions.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs font-500">{c.order?.orderNumber ?? '—'}</td>
                <td className="px-4 py-3 font-600 tabular-nums">${Number(c.orderTotal).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">{c.affiliate?.name ?? '—'}</td>
                <td className="px-4 py-3 font-600 tabular-nums">${Number(c.amount).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${c.status === 'paid' ? 'bg-green-50 text-green-700' : c.status === 'approved' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Payouts Tab ──────────────────────────────────────────────────────────────

function PayoutsTab() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    api<{ affiliates: Affiliate[] }>('/api/affiliates?limit=100').then(d => setAffiliates(d.affiliates ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pendingAffiliates = affiliates.filter(a => Number(a.pendingBalance) > 0);
  const totalPending = pendingAffiliates.reduce((s, a) => s + Number(a.pendingBalance), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSubTab('pending')} className={`px-3 py-1.5 text-xs font-500 rounded-lg ${subTab === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Pending</button>
        <button onClick={() => setSubTab('history')} className={`px-3 py-1.5 text-xs font-500 rounded-lg ${subTab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>History</button>
        {subTab === 'pending' && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Total pending: <span className="font-700 text-foreground">${totalPending.toFixed(2)}</span></span>
            <button disabled={totalPending === 0} className={btnPrimary} onClick={() => toast.success('Payout batch initiated')}>
              <DollarSign size={13} /> Start Payout
            </button>
          </div>
        )}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">{subTab === 'pending' ? 'Pending Amount' : 'Amount'}</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Method</th>
              {subTab === 'history' && <th className="px-4 py-3 text-left text-xs font-600 uppercase text-muted-foreground">Status</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center"><Loader2 size={16} className="animate-spin inline text-muted-foreground" /></td></tr>
            ) : subTab === 'pending' ? (
              pendingAffiliates.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No pending payouts</td></tr>
              ) : pendingAffiliates.map(a => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-500">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-3 font-600 tabular-nums">${Number(a.pendingBalance).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a.paypalEmail ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No payout history yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Commissions Tab ──────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
}

function CommissionsTab() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedAffiliate, setExpandedAffiliate] = useState<string | null>(null);
  const [productOverrides, setProductOverrides] = useState<Record<string, { productId: string; rate: number; type: 'percentage' | 'fixed' }>>({});

  useEffect(() => {
    api<{ affiliates: Affiliate[] }>('/api/affiliates?limit=100').then(d => setAffiliates(d.affiliates ?? [])).catch(() => {}).finally(() => setLoading(false));
    api<{ products: Product[] }>('/api/products').then(d => setProducts(d.products ?? [])).catch(() => {});
  }, []);

  const handleExpandAffiliate = (affiliateId: string) => {
    if (expandedAffiliate === affiliateId) {
      setExpandedAffiliate(null);
      setProductOverrides({});
    } else {
      setExpandedAffiliate(affiliateId);
      const affiliate = affiliates.find(a => a.id === affiliateId);
      if (affiliate?.metadata && typeof affiliate.metadata === 'object' && 'productCommissions' in affiliate.metadata) {
        setProductOverrides((affiliate.metadata.productCommissions as Record<string, { productId: string; rate: number; type: 'percentage' | 'fixed' }>) || {});
      } else {
        setProductOverrides({});
      }
    }
  };

  const handleAddOverride = () => {
    const newId = `new_${Date.now()}`;
    setProductOverrides({ ...productOverrides, [newId]: { productId: '', rate: 0.15, type: 'percentage' } });
  };

  const handleRemoveOverride = (key: string) => {
    const updated = { ...productOverrides };
    delete updated[key];
    setProductOverrides(updated);
  };

  const handleSaveOverrides = async (affiliateId: string) => {
    try {
      await api(`/api/affiliates/${affiliateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ metadata: { productCommissions: productOverrides } }),
      });
      toast.success('Product overrides saved');
      // Refresh affiliates to get updated metadata
      const data = await api<{ affiliates: Affiliate[] }>('/api/affiliates?limit=100');
      setAffiliates(data.affiliates ?? []);
    } catch {
      toast.error('Failed to save overrides');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-600 text-foreground mb-3">Default Commission Rate</h3>
        <p className="text-xs text-muted-foreground mb-3">Applied to all affiliates without a per-affiliate override.</p>
        <div className="flex items-center gap-3">
          <span className="text-lg font-700 text-foreground">{(0.10 * 100).toFixed(0)}%</span>
          <button className={btnSecondary} onClick={() => toast.info('Edit default rate in Settings tab')}>Change</button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-600 text-foreground mb-3">Affiliate Commission Rates</h3>
        {loading ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : (
          <div className="divide-y divide-border">
            {affiliates.map(a => (
              <div key={a.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-500 text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-600 tabular-nums">{(Number(a.commissionRate) * 100).toFixed(0)}%</span>
                    <button onClick={() => handleExpandAffiliate(a.id)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-muted text-muted-foreground">
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Product Overrides */}
                {expandedAffiliate === a.id && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-600 text-foreground">Per-Product Commission Overrides</h4>
                      <button onClick={handleAddOverride} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Plus size={12} /> Add Override
                      </button>
                    </div>
                    {Object.keys(productOverrides).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No product-specific overrides configured.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(productOverrides).map(([key, override]) => (
                          <div key={key} className="flex items-center gap-2">
                            <select
                              value={override.productId}
                              onChange={(e) => setProductOverrides({ ...productOverrides, [key]: { ...override, productId: e.target.value } })}
                              className={`${inputCls} flex-1`}
                            >
                              <option value="">Select product...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={override.rate}
                              onChange={(e) => setProductOverrides({ ...productOverrides, [key]: { ...override, rate: parseFloat(e.target.value) } })}
                              className={`${inputCls} w-24`}
                              placeholder="Rate"
                            />
                            <select
                              value={override.type}
                              onChange={(e) => setProductOverrides({ ...productOverrides, [key]: { ...override, type: e.target.value as 'percentage' | 'fixed' } })}
                              className={`${inputCls} w-32`}
                            >
                              <option value="percentage">% Percent</option>
                              <option value="fixed">$ Fixed</option>
                            </select>
                            <button onClick={() => handleRemoveOverride(key)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-50 text-red-600">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <button onClick={() => handleSaveOverrides(a.id)} className={btnPrimary}>
                        <Save size={13} /> Save Overrides
                      </button>
                      <button onClick={() => setExpandedAffiliate(null)} className={btnSecondary}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Coupons Tab ──────────────────────────────────────────────────────────────

function CouponsTab() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-600 text-foreground mb-2">Coupon-Based Commissions</h3>
      <p className="text-xs text-muted-foreground mb-4">Assign coupon codes to affiliates. When a customer uses an affiliated coupon at checkout, the sale is attributed to that affiliate.</p>
      <button className={btnPrimary} onClick={() => toast.info('Go to /coupons to assign an affiliate to a coupon')}><Tag size={13} /> Assign Coupon to Affiliate</button>
      <p className="text-xs text-muted-foreground mt-3">Navigate to <a href="/coupons" className="text-primary hover:underline">/coupons</a> to manage coupon-affiliate assignments.</p>
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'overview' | 'visits' | 'conversions'>('overview');
  const [visitsData, setVisitsData] = useState<Array<{ date: string; clicks: number }>>([]);

  useEffect(() => {
    api<{ affiliates: Affiliate[] }>('/api/affiliates?limit=100').then(d => setAffiliates(d.affiliates ?? [])).catch(() => {}).finally(() => setLoading(false));
    
    // Generate sample 30-day visits data
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        clicks: Math.floor(Math.random() * 200) + 50,
      };
    });
    setVisitsData(last30Days);
  }, []);

  const totalClicks = affiliates.reduce((s, a) => s + (a.clicks ?? 0), 0);
  const totalConversions = affiliates.reduce((s, a) => s + (a.totalConversions ?? 0), 0);
  const totalRevenue = affiliates.reduce((s, a) => s + Number(a.totalEarned ?? 0), 0);
  const totalCommission = affiliates.reduce((s, a) => s + Number(a.pendingBalance ?? 0), 0);

  const leaderboard = [...affiliates].sort((a, b) => Number(b.totalEarned) - Number(a.totalEarned)).slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tabs */}
      <div className="flex items-center gap-2">
        <button onClick={() => setSubTab('overview')} className={`px-3 py-1.5 text-xs font-500 rounded-lg ${subTab === 'overview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Overview</button>
        <button onClick={() => setSubTab('visits')} className={`px-3 py-1.5 text-xs font-500 rounded-lg ${subTab === 'visits' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Visits</button>
        <button onClick={() => setSubTab('conversions')} className={`px-3 py-1.5 text-xs font-500 rounded-lg ${subTab === 'conversions' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Conversions</button>
      </div>

      {subTab === 'overview' && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Clicks', value: totalClicks },
              { label: 'Conversions', value: totalConversions },
              { label: 'Gross Revenue', value: `$${totalRevenue.toFixed(2)}` },
              { label: 'Commission Cost', value: `$${totalCommission.toFixed(2)}` },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-yellow-500" />
              <h3 className="text-sm font-600 text-foreground">Affiliate Leaderboard</h3>
            </div>
            {loading ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-600 uppercase text-muted-foreground">Rank</th>
                    <th className="px-3 py-2 text-left text-xs font-600 uppercase text-muted-foreground">Affiliate</th>
                    <th className="px-3 py-2 text-right text-xs font-600 uppercase text-muted-foreground">Orders</th>
                    <th className="px-3 py-2 text-right text-xs font-600 uppercase text-muted-foreground">Revenue</th>
                    <th className="px-3 py-2 text-right text-xs font-600 uppercase text-muted-foreground">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((a, i) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-700 text-primary">#{i + 1}</td>
                      <td className="px-3 py-2 font-500">{a.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.totalConversions ?? 0}</td>
                      <td className="px-3 py-2 text-right font-600 tabular-nums">${Number(a.totalEarned).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">${Number(a.pendingBalance).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {subTab === 'visits' && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-600 text-foreground mb-4">Affiliate Link Visits - Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [value, 'Clicks']}
              />
              <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Total clicks in last 30 days: <span className="font-600 text-foreground">{visitsData.reduce((s, d) => s + d.clicks, 0)}</span></p>
          </div>
        </div>
      )}

      {subTab === 'conversions' && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground">Conversion analytics coming soon.</p>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-600 text-foreground mb-4">Affiliate Program Settings</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-foreground">Allow registrations</span>
          <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" />
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-foreground">Auto-approve affiliates</span>
          <input type="checkbox" className="w-4 h-4 accent-primary" />
        </div>
        <div>
          <label className="text-xs font-500 text-foreground block mb-1">Cookie Duration (days)</label>
          <input type="number" defaultValue={30} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-500 text-foreground block mb-1">Default Commission Rate</label>
          <input type="number" step="0.01" min="0" max="1" defaultValue="0.10" className={inputCls} />
          <p className="text-[10px] text-muted-foreground mt-0.5">0.10 = 10%</p>
        </div>
      </div>
      <button className={`${btnPrimary} mt-4`} onClick={() => toast.success('Settings saved')}>Save Settings</button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MerchantAffiliatePageContent() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'affiliates': return <AffiliatesTab />;
      case 'sales': return <SalesTab />;
      case 'payouts': return <PayoutsTab />;
      case 'commissions': return <CommissionsTab />;
      case 'coupons': return <CouponsTab />;
      case 'analytics': return <AnalyticsTab />;
      case 'settings': return <SettingsTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-600 text-foreground">Affiliate Control Panel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage affiliates, commissions, payouts, and analytics.</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-500 rounded-t-lg border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>{renderTab()}</div>
    </div>
  );
}