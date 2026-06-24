'use client';

import React, { useState, useCallback, useEffect } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Users, DollarSign, CreditCard, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Edit2, Check, X as XIcon, Mail, Phone, MapPin, Calendar, ShoppingBag, Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import BackButton from '@/components/ui/back-button';

interface StripePaymentMethod {
  id: string;
  type: string;
  card?: { brand: string; last4: string; exp_month: number; exp_year: number };
}

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  receipt_url: string | null;
}

interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  description: string | null;
  created: number;
  currency: string | null;
  balance: number;
  delinquent: boolean | null;
  metadata: Record<string, string>;
  address: {
    city: string | null;
    country: string | null;
    line1: string | null;
    postal_code: string | null;
    state: string | null;
  } | null;
  subscriptions?: {
    data: Array<{
      id: string;
      status: string;
      current_period_end: number;
      items: { data: Array<{ price: { nickname: string | null; unit_amount: number | null; currency: string } }> };
    }>;
  };
  paymentMethods: StripePaymentMethod[];
  charges: StripeCharge[];
}

interface CustomersResponse {
  customers: StripeCustomer[];
  hasMore: boolean;
  lastId?: string;
}

function useStripeCustomers() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);
  const fetch_ = useCallback(async (cursor?: string, searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (cursor) params.set('starting_after', cursor);
      if (searchTerm) params.set('search', searchTerm);
      const res = await fetch(`/api/customers/stripe-sync?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback((searchTerm?: string) => {
    setCursors([]);
    setCurrentCursor(undefined);
    fetch_(undefined, searchTerm ?? search);
  }, [fetch_, search]);

  const nextPage = useCallback(() => {
    if (!data?.lastId) return;
    setCursors((prev) => [...prev, currentCursor ?? '']);
    setCurrentCursor(data.lastId);
    fetch_(data.lastId, search);
  }, [data, currentCursor, fetch_, search]);

  const prevPage = useCallback(() => {
    const prev = [...cursors];
    const last = prev.pop();
    setCursors(prev);
    setCurrentCursor(last || undefined);
    fetch_(last || undefined, search);
  }, [cursors, fetch_, search]);

  return { data, loading, error, load, nextPage, prevPage, hasPrev: cursors.length > 0, search, setSearch };
}

function EditableField({ value, onSave, label }: { value: string; onSave: (v: string) => Promise<void>; label: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(val);
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 group">
        <span className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">—</span>}</span>
        <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
          <Edit2 size={11} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={label}
        className="text-sm border border-primary rounded px-2 py-0.5 bg-background text-foreground outline-none flex-1 min-w-0"
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      />
      <button onClick={save} disabled={saving} className="text-success hover:opacity-80 disabled:opacity-40">
        <Check size={13} />
      </button>
      <button onClick={() => { setEditing(false); setVal(value); }} className="text-danger hover:opacity-80">
        <XIcon size={13} />
      </button>
    </div>
  );
}

function CustomerDetailSlideOver({ customer, onClose, onUpdate }: { customer: StripeCustomer; onClose: () => void; onUpdate: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleted, setDeleted] = useState(false);

  const updateField = async (field: string, value: string) => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/customers/stripe-sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      onUpdate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || deleted) return;
    const name = customer.name ?? customer.email ?? 'this customer';
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete customer');
      setDeleted(true);
      onUpdate();
      onClose();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const totalSpent = customer.charges
    .filter((c) => c.status === 'succeeded')
    .reduce((s, c) => s + c.amount, 0) / 100;

  const sub = customer.subscriptions?.data?.[0];
  const joined = new Date(customer.created * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-lg bg-card border-l border-border flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-600 text-sm">
              {(customer.name ?? customer.email ?? '?').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-600 text-foreground">{customer.name ?? 'Unnamed'}</h2>
              <p className="text-xs text-muted-foreground">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting || deleted}
              title="Delete customer"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-danger/10 hover:text-danger transition-colors text-muted-foreground"
            >
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {saveError && (
            <div className="flex items-center gap-2 bg-danger-bg border border-danger/20 rounded-lg px-3 py-2 text-xs text-danger">
              <AlertCircle size={12} /> {saveError}
            </div>
          )}

          {deleteError && (
            <div className="flex items-center gap-2 bg-danger-bg border border-danger/20 rounded-lg px-3 py-2 text-xs text-danger">
              <AlertCircle size={12} /> {deleteError}
            </div>
          )}

          {/* Stripe link */}
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-muted-foreground" />
              <span className="text-xs font-mono text-secondary-foreground">{customer.id}</span>
            </div>
            <a
              href={`https://dashboard.stripe.com/customers/${customer.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:opacity-80 flex items-center gap-1"
            >
              Stripe <ExternalLink size={10} />
            </a>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Charges</p>
              <p className="text-lg font-600 text-foreground">{customer.charges.filter(c => c.status === 'succeeded').length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
              <p className="text-lg font-600 text-foreground">${totalSpent.toFixed(0)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className={`text-lg font-600 ${customer.balance < 0 ? 'text-success' : 'text-foreground'}`}>
                ${Math.abs(customer.balance / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Editable Contact Info */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Contact Info (editable — syncs to Stripe)</p>
            <div className="flex flex-col gap-2.5 bg-muted/30 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Mail size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Email</p>
                  <EditableField value={customer.email ?? ''} label="Email" onSave={(v) => updateField('email', v)} />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Name</p>
                  <EditableField value={customer.name ?? ''} label="Name" onSave={(v) => updateField('name', v)} />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
                  <EditableField value={customer.phone ?? ''} label="Phone" onSave={(v) => updateField('phone', v)} />
                </div>
              </div>
              {customer.address && (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Location</p>
                    <p className="text-sm text-foreground">
                      {[customer.address.city, customer.address.state, customer.address.country].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Joined</p>
                  <p className="text-sm text-foreground">{joined}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Description / Notes</p>
            <EditableField value={customer.description ?? ''} label="Description" onSave={(v) => updateField('description', v)} />
          </div>

          {/* Subscription */}
          {sub && (
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Subscription</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">
                  {sub.items.data[0]?.price.nickname ?? 'Subscription'}
                  {sub.items.data[0]?.price.unit_amount != null && (
                    <span className="text-muted-foreground ml-1">
                      ${(sub.items.data[0].price.unit_amount / 100).toFixed(2)}/{sub.items.data[0].price.currency}
                    </span>
                  )}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-500 ${sub.status === 'active' ? 'bg-success-bg text-success' : sub.status === 'past_due' ? 'bg-warning-bg text-warning' : 'bg-muted text-muted-foreground'}`}>
                  {sub.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Renews {new Date(sub.current_period_end * 1000).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Payment Methods */}
          {customer.paymentMethods.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Payment Methods</p>
              <div className="flex flex-col gap-2">
                {customer.paymentMethods.map((pm) => (
                  <div key={pm.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl">
                    <CreditCard size={14} className="text-muted-foreground" />
                    {pm.card ? (
                      <span className="text-sm text-foreground capitalize">
                        {pm.card.brand} •••• {pm.card.last4}
                        <span className="text-muted-foreground ml-2 text-xs">{pm.card.exp_month}/{pm.card.exp_year}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-foreground capitalize">{pm.type}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {Object.keys(customer.metadata).length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Metadata</p>
              <div className="flex flex-col gap-1.5 bg-muted/30 rounded-xl p-3">
                {Object.entries(customer.metadata).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono">{k}</span>
                    <span className="text-foreground font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Charges */}
          {customer.charges.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Recent Charges</p>
              <div className="flex flex-col gap-1.5">
                {customer.charges.slice(0, 5).map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div>
                      <p className="text-sm text-foreground font-500">${(charge.amount / 100).toFixed(2)} {charge.currency.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(charge.created * 1000).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-500 ${charge.status === 'succeeded' ? 'bg-success-bg text-success' : charge.status === 'failed' ? 'bg-danger-bg text-danger' : 'bg-muted text-muted-foreground'}`}>
                        {charge.status}
                      </span>
                      {charge.receipt_url && (
                        <a href={charge.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function CustomersPageContent() {
  const { data, loading, error, load, nextPage, prevPage, hasPrev, search, setSearch } = useStripeCustomers();
  const [selected, setSelected] = useState<StripeCustomer | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });
  const [createStatus, setCreateStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [createError, setCreateError] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };



  const customers = data?.customers ?? [];
  const totalSpent = customers.reduce((s, c) => s + c.charges.filter(ch => ch.status === 'succeeded').reduce((a, ch) => a + ch.amount, 0) / 100, 0);
  const withSubs = customers.filter((c) => (c.subscriptions?.data?.length ?? 0) > 0).length;
  const withCards = customers.filter((c) => c.paymentMethods.length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {loading ? 'Loading from Stripe…' : `${customers.length} customers · Stripe-synced`}
            {loading && <RefreshCw size={10} className="animate-spin text-primary" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowCreateModal(true); setCreateStatus('idle'); setCreateError(''); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={13} />
            New Customer
          </button>
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <a
            href="https://dashboard.stripe.com/customers"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={13} />
            Stripe Dashboard
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Customers" value={loading ? '—' : String(customers.length)} subValue="This page" icon={Users} />
        <MetricCard label="Page Revenue" value={loading ? '—' : `$${totalSpent.toFixed(0)}`} subValue="Successful charges" icon={DollarSign} variant="success" />
        <MetricCard label="Subscribers" value={loading ? '—' : String(withSubs)} subValue="Active subscriptions" icon={ShoppingBag} />
        <MetricCard label="Cards on File" value={loading ? '—' : String(withCards)} subValue="Saved payment methods" icon={CreditCard} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-danger-bg border border-danger/20 rounded-xl p-4 text-sm text-danger">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-600">Stripe Error</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 flex-1 min-w-48">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by email or name…"
            value={search}
            onChange={handleSearch}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>
        <button type="submit" className="h-9 px-4 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Location</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Charges</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Total Spent</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Subscription</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No customers found in Stripe
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const spent = c.charges.filter(ch => ch.status === 'succeeded').reduce((s, ch) => s + ch.amount, 0) / 100;
                  const chargeCount = c.charges.filter(ch => ch.status === 'succeeded').length;
                  const sub = c.subscriptions?.data?.[0];
                  const pm = c.paymentMethods[0];
                  return (
                    <tr key={c.id} onClick={() => setSelected(c)} className="hover:bg-muted/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-500 text-foreground">{c.name ?? 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{c.email ?? '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {c.address?.country ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{chargeCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-500 text-foreground">${spent.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {sub ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${sub.status === 'active' ? 'bg-success-bg text-success' : sub.status === 'past_due' ? 'bg-warning-bg text-warning' : 'bg-muted text-muted-foreground'}`}>
                            {sub.status}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pm?.card ? (
                          <div className="flex items-center gap-1.5">
                            <CreditCard size={12} className="text-muted-foreground" />
                            <span className="text-xs text-foreground capitalize">{pm.card.brand} ••{pm.card.last4}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(c.created * 1000).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && data && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{customers.length} customers on this page</p>
            <div className="flex items-center gap-2">
              <button
                disabled={!hasPrev}
                onClick={prevPage}
                className="h-7 px-3 rounded border border-border text-xs font-500 disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={12} /> Previous
              </button>
              <button
                disabled={!data.hasMore}
                onClick={nextPage}
                className="h-7 px-3 rounded border border-border text-xs font-500 disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1"
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <CustomerDetailSlideOver
          customer={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { load(search); }}
        />
      )}

      {/* ── Create Customer Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (createStatus !== 'saving') { setShowCreateModal(false); setCreateStatus('idle'); } }} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl my-8">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-600 text-foreground">Create Customer</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Creates in Stripe and saves locally</p>
              </div>
              <button
                onClick={() => { if (createStatus !== 'saving') { setShowCreateModal(false); setCreateStatus('idle'); } }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {createStatus === 'success' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-success-bg border border-success/20 rounded-lg text-success text-sm">
                  <CheckCircle size={14} />
                  Customer created successfully!
                </div>
              )}

              {createStatus === 'error' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle size={14} />
                  {createError || 'Failed to create customer'}
                </div>
              )}

              {createStatus !== 'success' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">First Name</label>
                      <input
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={createForm.firstName}
                        onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">Last Name</label>
                      <input
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={createForm.lastName}
                        onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">Email *</label>
                    <input
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">Phone</label>
                    <input
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-3">Address</p>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Line 1</label>
                        <input
                          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={createForm.line1}
                          onChange={(e) => setCreateForm((f) => ({ ...f, line1: e.target.value }))}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">City</label>
                          <input
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={createForm.city}
                            onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">State</label>
                          <input
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={createForm.state}
                            onChange={(e) => setCreateForm((f) => ({ ...f, state: e.target.value }))}
                            placeholder="State"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Postal Code</label>
                          <input
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={createForm.postal_code}
                            onChange={(e) => setCreateForm((f) => ({ ...f, postal_code: e.target.value }))}
                            placeholder="90210"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Country</label>
                          <input
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={createForm.country}
                            onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value }))}
                            placeholder="US"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {createStatus !== 'success' && (
              <div className="px-6 pb-6 flex gap-2">
                <button
                  onClick={async () => {
                    if (!createForm.email.trim()) {
                      setCreateError('Email is required');
                      setCreateStatus('error');
                      return;
                    }
                    setCreateStatus('saving');
                    setCreateError('');
                    try {
                      const res = await fetch('/api/customers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(createForm),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error ?? 'Failed to create customer');
                      setCreateStatus('success');
                      load(search);
                    } catch (err) {
                      setCreateStatus('error');
                      setCreateError(err instanceof Error ? err.message : 'Failed to create customer');
                    }
                  }}
                  disabled={createStatus === 'saving' || !createForm.email.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {createStatus === 'saving' ? (
                    <><RefreshCw size={14} className="animate-spin" />Creating…</>
                  ) : (
                    <><Plus size={14} />Create Customer</>
                  )}
                </button>
                <button
                  onClick={() => { setShowCreateModal(false); setCreateStatus('idle'); }}
                  disabled={createStatus === 'saving'}
                  className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}

            {createStatus === 'success' && (
              <div className="px-6 pb-6 flex gap-2">
                <button
                  onClick={() => { setShowCreateModal(false); setCreateStatus('idle'); setCreateForm({ firstName: '', lastName: '', email: '', phone: '', line1: '', city: '', state: '', postal_code: '', country: '' }); }}
                  className="flex-1 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}