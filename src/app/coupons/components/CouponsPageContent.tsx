'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import {
  Tag,
  TrendingUp,
  Plus,
  Copy,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import BackButton from '@/components/ui/back-button';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  usage_count: number;
  usage_limit: number | null;
  status: 'active' | 'expired' | 'disabled';
  expires_at: string | null;
  minimum_order: number | null;
  revenue: number;
  stripe_coupon_id: string | null;
  created_at: string;
}

interface NewCouponForm {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: string;
  usageLimit: string;
  minimumOrder: string;
  expiresAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success-bg text-success',
  expired: 'bg-muted text-muted-foreground',
  disabled: 'bg-danger-bg text-danger',
};

const EMPTY_FORM: NewCouponForm = {
  code: '',
  type: 'percentage',
  value: '',
  usageLimit: '',
  minimumOrder: '',
  expiresAt: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CouponsPageContent() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewCouponForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Fetch coupons ────────────────────────────────────────────────────────────
  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coupons');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load coupons');
      setCoupons(json.coupons ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // ── KPI calculations ─────────────────────────────────────────────────────────
  const activeCoupons = coupons.filter((c) => c.status === 'active').length;
  const totalRevenue = coupons.reduce((s, c) => s + Number(c.revenue), 0);
  const totalUsage = coupons.reduce((s, c) => s + c.usage_count, 0);

  // ── Copy code ────────────────────────────────────────────────────────────────
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ── Toggle status ────────────────────────────────────────────────────────────
  const handleToggle = async (coupon: Coupon) => {
    if (coupon.status === 'expired') return;
    const newStatus = coupon.status === 'active' ? 'disabled' : 'active';
    setTogglingId(coupon.id);
    try {
      const res = await fetch('/api/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coupon.id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, status: newStatus } : c)));
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete coupon ────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon? This will also remove it from Stripe.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  // ── Create coupon ────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: form.value ? Number(form.value) : 0,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          minimumOrder: form.minimumOrder ? Number(form.minimumOrder) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create coupon');
      setSaveSuccess(true);
      setForm(EMPTY_FORM);
      setCoupons((prev) => [json.coupon, ...prev]);
      setTimeout(() => {
        setShowModal(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Coupon Codes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage discount codes — synced automatically with Stripe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCoupons}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => { setShowModal(true); setSaveError(null); setSaveSuccess(false); setForm(EMPTY_FORM); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            New Coupon
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Active Coupons"
          value={String(activeCoupons)}
          subValue={`${coupons.length} total`}
          icon={Tag}
        />
        <MetricCard
          label="Total Usage"
          value={totalUsage.toLocaleString()}
          subValue="All time redemptions"
          icon={Tag}
        />
        <MetricCard
          label="Coupon Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}k`}
          subValue="All time"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-danger-bg text-danger rounded-lg text-sm">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Loading coupons…
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Tag size={32} className="opacity-30" />
            <p className="text-sm">No coupons yet. Create your first discount code.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Value</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Usage</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Min Order</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Expires</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Revenue</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((c) => {
                  const expires = c.expires_at
                    ? new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Never';
                  const isToggling = togglingId === c.id;
                  const isDeleting = deletingId === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      {/* Code */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-600 text-foreground bg-muted px-2 py-0.5 rounded text-xs">
                            {c.code}
                          </code>
                          <button
                            onClick={() => handleCopy(c.code)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === c.code ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                          {c.stripe_coupon_id && (
                            <span className="text-xs text-muted-foreground/60" title={`Stripe ID: ${c.stripe_coupon_id}`}>
                              ✓ Stripe
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {c.type.replace('_', ' ')}
                      </td>
                      {/* Value */}
                      <td className="px-4 py-3 text-right font-500 text-foreground">
                        {c.type === 'percentage'
                          ? `${c.value}%`
                          : c.type === 'fixed'
                          ? `$${c.value}`
                          : 'Free'}
                      </td>
                      {/* Usage */}
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {c.usage_count}
                        {c.usage_limit ? `/${c.usage_limit}` : ''}
                      </td>
                      {/* Min Order */}
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {c.minimum_order ? `$${c.minimum_order}` : '—'}
                      </td>
                      {/* Expires */}
                      <td className="px-4 py-3 text-sm text-secondary-foreground">{expires}</td>
                      {/* Revenue */}
                      <td className="px-4 py-3 text-right tabular-nums font-500 text-foreground">
                        {Number(c.revenue) > 0 ? `$${Number(c.revenue).toLocaleString()}` : '—'}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${STATUS_COLORS[c.status]}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {c.status !== 'expired' && (
                            <button
                              onClick={() => handleToggle(c)}
                              disabled={isToggling}
                              className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              title={c.status === 'active' ? 'Disable coupon' : 'Enable coupon'}
                            >
                              {c.status === 'active' ? (
                                <ToggleRight size={16} className="text-success" />
                              ) : (
                                <ToggleLeft size={16} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded hover:bg-danger-bg text-muted-foreground hover:text-danger transition-colors disabled:opacity-50"
                            title="Delete coupon"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stripe Sync Info */}
      <div className="flex items-start gap-3 px-4 py-3 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground">
        <CheckCircle size={14} className="mt-0.5 shrink-0 text-success" />
        <span>
          Coupons are automatically synced to Stripe when created. When a customer applies a coupon code at checkout,
          the discount is applied directly in Stripe before the payment is processed — no manual steps required.
        </span>
      </div>

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-600 text-foreground">New Coupon Code</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="px-6 py-5 flex flex-col gap-4">
              {/* Code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-500 text-muted-foreground uppercase tracking-wide">
                  Coupon Code <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAVE20"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 font-mono"
                />
              </div>

              {/* Type + Value row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-500 text-muted-foreground uppercase tracking-wide">
                    Type <span className="text-danger">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as NewCouponForm['type'] }))}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed ($)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-500 text-muted-foreground uppercase tracking-wide">
                    {form.type === 'percentage' ? 'Discount %' : form.type === 'fixed' ? 'Discount $' : 'Value'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={form.type === 'percentage' ? '20' : form.type === 'fixed' ? '30' : '0'}
                    value={form.value}
                    disabled={form.type === 'free_shipping'}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Usage Limit + Min Order row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-500 text-muted-foreground uppercase tracking-wide">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.usageLimit}
                    onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-500 text-muted-foreground uppercase tracking-wide">
                    Min Order ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="None"
                    value={form.minimumOrder}
                    onChange={(e) => setForm((f) => ({ ...f, minimumOrder: e.target.value }))}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-500 text-muted-foreground uppercase tracking-wide">
                  Expiry Date
                </label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              {/* Stripe note */}
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                This coupon will be created in Stripe automatically. When applied at checkout, Stripe adjusts the price before payment.
              </p>

              {/* Errors / Success */}
              {saveError && (
                <div className="flex items-center gap-2 text-danger text-xs bg-danger-bg px-3 py-2 rounded-lg">
                  <AlertCircle size={13} />
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-2 text-success text-xs bg-success-bg px-3 py-2 rounded-lg">
                  <CheckCircle size={13} />
                  Coupon created and synced to Stripe!
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.code}
                  className="px-5 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <RefreshCw size={13} className="animate-spin" />}
                  {saving ? 'Creating…' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
