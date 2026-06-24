'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, BarChart3, Users, TrendingUp, Link2, Plus, Search, ChevronRight,
  ArrowLeft, Loader2, Eye, Settings, Megaphone, Handshake, Trophy, Tag,
  Scissors, FileText, Flag, Gift, CheckCircle, ExternalLink, Copy, X, RefreshCw, Edit, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ProductWizard from './ProductWizard';

// ── Types ────────────────────────────────────────────────────────────────────

type ViewState = 'vendor_dashboard' | 'funnel_list' | 'funnel_dashboard' | 'product_wizard';

interface Funnel {
  id: string;
  name: string;
  slug: string;
  status: string;
  steps: Array<{ id: string }>;
  createdAt?: string;
  funnel_products?: Array<{
    id: string;
    productId: string;
    sortOrder: number;
    product: Product;
  }>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  status: string;
  type: string;
  images?: Array<{ url: string }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `API error ${res.status}`);
  return res.json();
}

const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';

// ── Vendor Dashboard View ────────────────────────────────────────────────────

function VendorDashboard({ onNavigate }: { onNavigate: (view: ViewState, id?: string) => void }) {
  const router = useRouter();
  const [stats, setStats] = useState<{ sales: number; refunds: number; volume: number } | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number }>>([]);

  useEffect(() => {
    api<{ totalRevenue: number; totalRefunds: number }>('/api/analytics')
      .then(d => setStats({ sales: d.totalRevenue ?? 0, refunds: d.totalRefunds ?? 0, volume: d.totalRevenue ?? 0 }))
      .catch(() => {});
    
    // Generate sample 30-day revenue data
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        revenue: Math.floor(Math.random() * 500) + 100,
      };
    });
    setRevenueData(last30Days);
  }, []);

  const quickLinks = [
    { label: 'Funnels & Products', icon: Package, action: () => onNavigate('funnel_list'), color: 'bg-blue-50 text-blue-600' },
    { label: 'Reporting', icon: BarChart3, action: () => router.push('/reporting-dashboard'), color: 'bg-purple-50 text-purple-600' },
    { label: 'Manage Affiliates', icon: Users, action: () => router.push('/merchant-affiliate'), color: 'bg-green-50 text-green-600' },
    { label: 'Affiliate Performance', icon: TrendingUp, action: () => router.push('/affiliates'), color: 'bg-orange-50 text-orange-600' },
    { label: 'Customers', icon: Users, action: () => router.push('/customers'), color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Checkout Links', icon: Link2, action: () => toast.info('Checkout links modal'), color: 'bg-pink-50 text-pink-600' },
    { label: 'New Funnel', icon: Plus, action: () => onNavigate('funnel_list'), color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Links */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-600 text-foreground">Quick Links</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button key={link.label} onClick={link.action}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${link.color} group-hover:scale-105 transition-transform`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-500 text-foreground text-center leading-tight">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex border border-border rounded-lg overflow-hidden">
                {['30d', '7d', '24h'].map(r => (
                  <button key={r} className="px-3 py-1 text-xs font-500 text-muted-foreground hover:bg-muted transition-colors">{r}</button>
                ))}
              </div>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={14} /></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics */}
          <div className="space-y-3">
            {[
              { label: 'Initial Sales', value: `$${(stats?.sales ?? 0).toFixed(2)}` },
              { label: 'Refunds', value: `$${(stats?.refunds ?? 0).toFixed(2)}` },
              { label: 'Net Volume', value: `$${((stats?.volume ?? 0) - (stats?.refunds ?? 0)).toFixed(2)}` },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className="text-sm font-600 text-foreground tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4">
            <h4 className="text-xs font-600 text-foreground mb-3">30-Day Revenue Trend</h4>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Funnel List View ─────────────────────────────────────────────────────────

function FunnelListView({ onNavigate }: { onNavigate: (view: ViewState, id?: string) => void }) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newFunnel, setNewFunnel] = useState({ name: '', description: '', status: 'draft' });

  useEffect(() => {
    api<{ funnels: Funnel[] }>('/api/upsell/funnels')
      .then(d => setFunnels(d.funnels ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newFunnel.name) { toast.error('Name required'); return; }
    try {
        const created = await api<Funnel>('/api/upsell/funnels', {
          method: 'POST',
          body: JSON.stringify({ slug: newFunnel.name.toLowerCase().replace(/\s+/g, '-'), ...newFunnel }),
      });
      setFunnels(prev => [created, ...prev]);
      setShowCreate(false);
      setNewFunnel({ name: '', description: '', status: 'draft' });
      toast.success('Funnel created');
    } catch { toast.error('Failed to create funnel'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('vendor_dashboard')} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-lg font-600 text-foreground">Product Funnels</h2>
            <p className="text-xs text-muted-foreground">Manage your product funnels and pages</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
          <Plus size={13} /> New Funnel
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-600 text-foreground">Create Funnel</h3>
          <input value={newFunnel.name} onChange={e => setNewFunnel({ ...newFunnel, name: e.target.value })} placeholder="Funnel name" className={inputCls} />
          <textarea value={newFunnel.description} onChange={e => setNewFunnel({ ...newFunnel, description: e.target.value })} placeholder="Description" className={`${inputCls} h-20 resize-none`} />
          <div className="flex items-center gap-2">
            <button onClick={handleCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-500 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : funnels.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-500 text-muted-foreground">No funnels yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first funnel to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {funnels.map(f => (
            <div key={f.id} className="relative group/card">
              <button onClick={() => onNavigate('funnel_dashboard', f.id)}
                className="w-full bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group text-left">
                <div className="h-32 bg-muted/30 flex items-center justify-center relative">
                  <Package size={28} className="text-muted-foreground/40 group-hover:scale-110 transition-transform" />
                  <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-500 ${f.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.status === 'active' ? 'Live' : 'Draft'}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-600 text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.steps?.length ?? 0} steps</p>
                </div>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('Delete this funnel? This cannot be undone.')) return;
                  try {
                    await fetch(`/api/upsell/funnels/${f.id}`, { method: 'DELETE' });
                    setFunnels(prev => prev.filter(x => x.id !== f.id));
                    toast.success('Funnel deleted');
                  } catch { toast.error('Failed to delete funnel'); }
                }}
                className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-10"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Funnel Dashboard View ────────────────────────────────────────────────────

function FunnelDashboardView({ funnelId, onNavigate }: { funnelId: string; onNavigate: (view: ViewState, id?: string) => void }) {
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProductList, setShowProductList] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    api<{ funnel: Funnel }>(`/api/upsell/funnels/${funnelId}`)
      .then(d => setFunnel(d.funnel ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [funnelId]);

  const handleManageProducts = useCallback(() => {
    setShowProductList(true);
    setLoadingProducts(true);
    // Re-fetch funnel to get latest funnel_products
    api<{ funnel: Funnel }>(`/api/upsell/funnels/${funnelId}`)
      .then(d => {
        const fp = d.funnel?.funnel_products ?? [];
        setProducts(fp.map(fp => fp.product));
        setFunnel(d.funnel ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [funnelId]);

  const handleEditProduct = useCallback((productId: string) => {
    onNavigate('product_wizard', `${funnelId}::${productId}`);
  }, [funnelId, onNavigate]);

  const removeProduct = async (productId: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const actions = [
    { label: 'Manage Products', desc: 'Add, edit, or remove products from this funnel', icon: Package, action: handleManageProducts },
    { label: 'Checkout Links', desc: 'Get shareable checkout URLs for this funnel', icon: Scissors, action: () => toast.info('Checkout links') },
    { label: 'Sales', desc: 'View orders and revenue for this funnel', icon: FileText, action: () => toast.info('Sales view') },
    { label: 'Manage Coupons', desc: 'Create and manage discount codes', icon: Tag, action: () => toast.info('Coupons') },
    { label: 'Affiliate Performance', desc: 'Track affiliate-driven sales', icon: Flag, action: () => toast.info('Affiliate performance') },
    { label: 'Affiliate Signup Tools', desc: 'Get affiliate signup links and promo materials', icon: Megaphone, action: () => toast.info('Promo tools') },
    { label: 'Manage Affiliates', desc: 'Approve, reject, and manage affiliate partners', icon: Handshake, action: () => toast.info('Manage affiliates') },
    { label: 'Affiliate Leaderboard', desc: 'See top-performing affiliates', icon: Trophy, action: () => toast.info('Leaderboard') },
  ];

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('funnel_list')} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={18} /></button>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            <span className="cursor-pointer hover:text-foreground" onClick={() => onNavigate('funnel_list')}>Funnels</span>
            {' > '}
            <span>{funnel?.name ?? 'Funnel'}</span>
          </p>
          <h2 className="text-lg font-600 text-foreground">Funnel Dashboard</h2>
        </div>
      </div>

      {showProductList ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowProductList(false)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /></button>
            <h3 className="text-sm font-600 text-foreground">Products in {funnel?.name}</h3>
            <button onClick={() => onNavigate('product_wizard', `${funnelId}::new`)} className="ml-auto px-3 py-1.5 bg-primary text-primary-foreground text-xs font-500 rounded-lg hover:opacity-90">+ Add Product</button>
          </div>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Package size={28} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No products yet</p>
              <button onClick={() => onNavigate('product_wizard', `${funnelId}::new`)} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90">+ Add Product</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map(p => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-sm font-600 text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">${p.price} · {p.type}</p>
<div className="flex gap-2 mt-auto">
                   <button onClick={() => handleEditProduct(p.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-500 rounded-lg hover:opacity-90">
                     <Edit size={11} /> Edit
                   </button>
                   <button onClick={() => removeProduct(p.id)} className="px-2.5 py-1.5 bg-red-500/10 text-red-500 text-xs font-500 rounded-lg hover:bg-red-500/20 transition-colors">
                     <Trash2 size={11} />
                   </button>
                 </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-600 text-foreground">{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.desc}</p>
                </div>
                <button onClick={a.action} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-500 rounded-lg hover:opacity-90 transition-opacity flex-shrink-0">Manage</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MerchantsellPageContent() {
  const [view, setView] = useState<ViewState>('vendor_dashboard');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const handleNavigate = useCallback((newView: ViewState, id?: string) => {
    if (newView === 'product_wizard' && id && id.includes('::')) {
      const [fId, pId] = id.split('::');
      setSelectedFunnelId(fId);
      setSelectedProductId(pId);
      setView('product_wizard');
    } else {
      setView(newView);
      if (id) setSelectedFunnelId(id);
      setSelectedProductId('');
    }
  }, []);

  switch (view) {
    case 'funnel_list':
      return <FunnelListView onNavigate={handleNavigate} />;
    case 'funnel_dashboard':
      return <FunnelDashboardView funnelId={selectedFunnelId} onNavigate={handleNavigate} />;
    case 'product_wizard':
      return <ProductWizard productId={selectedProductId} funnelId={selectedFunnelId} onClose={() => setView('vendor_dashboard')} />;
    case 'vendor_dashboard':
    default:
      return <VendorDashboard onNavigate={handleNavigate} />;
  }
}