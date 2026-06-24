'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowDown,
  Zap,
  TrendingDown,
  ShoppingBag,
  Gift,
  Eye,
  Save,
  Edit2,
  X,
  CheckCircle,
  AlertCircle,
  Copy,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import BackButton from '@/components/ui/back-button';
import FunnelDashboardTabs from './FunnelDashboardTabs';


// ── Types ─────────────────────────────────────────────────────────────────────

type StepType = 'upsell' | 'downsell' | 'cross_sell' | 'order_bump';

interface FunnelStep {
  id?: string;
  step_order: number;
  step_type: StepType;
  name: string;
  price_cents: number;
  currency: string;
  html_content: string;
  decline_next_step_order: number | null;
  accept_next_step_order: number | null;
  stripe_price_id?: string;
}

interface Funnel {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  trigger_product_id?: string;
  is_active: boolean;
  funnel_steps: FunnelStep[];
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_TYPE_CONFIG: Record<StepType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  upsell: { label: 'Upsell', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
  downsell: { label: 'Downsell', icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
  cross_sell: { label: 'Cross-sell', icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  order_bump: { label: 'Order Bump', icon: Gift, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30' },
};

const EMPTY_STEP = (): FunnelStep => ({
  step_order: 1,
  step_type: 'upsell',
  name: '',
  price_cents: 0,
  currency: 'usd',
  html_content: '',
  decline_next_step_order: null,
  accept_next_step_order: null,
});

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; text-align: center; }
    h1 { font-size: 2rem; margin-bottom: 12px; }
    p { color: #555; margin-bottom: 24px; }
    .price { font-size: 2.5rem; font-weight: bold; color: #16a34a; margin: 16px 0; }
    .btn-yes { background: #16a34a; color: #fff; border: none; padding: 16px 40px; font-size: 1.1rem; border-radius: 8px; cursor: pointer; margin: 8px; }
    .btn-no { background: transparent; color: #888; border: none; padding: 12px 24px; font-size: 0.9rem; cursor: pointer; text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Wait! Special One-Time Offer</h1>
  <p>Add this to your order right now — no extra checkout needed.</p>
  <div class="price">\${{PRICE}}</div>
  <p>{{DESCRIPTION}}</p>
  <!-- wiastro will inject accept/decline buttons automatically -->
</body>
</html>`;

// ── Main Component ────────────────────────────────────────────────────────────

export default function UpsellFunnelBuilder() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [storeId, setStoreId] = useState('');

  // Resolve configured site URL (DNS-aware): env var takes priority over browser origin
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  // Editor state
  const [editingFunnel, setEditingFunnel] = useState<Partial<Funnel> | null>(null);
  const [editingSteps, setEditingSteps] = useState<FunnelStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewStepIdx, setPreviewStepIdx] = useState(0);
  const [htmlPreviewStep, setHtmlPreviewStep] = useState<number | null>(null);

  const fetchFunnels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/upsell/funnels');
      const data = await res.json();
      setFunnels(data.funnels ?? []);
    } catch {
      setError('Failed to load funnels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  useEffect(() => {
    const initStoreId = async () => {
      try {
        const res = await fetch('/api/storefront');
        const json = await res.json();
        setStoreId(Array.isArray(json.templates) && json.templates.length > 0 ? String(json.templates[0].id) : '');
      } catch {
        setStoreId('');
      }
    };
    initStoreId();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Funnel CRUD ──────────────────────────────────────────────────────────────

  const openNewFunnel = () => {
    setEditingFunnel({ name: '', slug: '', description: '', trigger_product_id: '', is_active: true } as any);
    setEditingSteps([{ ...EMPTY_STEP(), html_content: DEFAULT_HTML }]);
    setExpandedStep(0);
    setPreviewMode(false);
  };

  const openEditFunnel = (funnel: Funnel) => {
    setEditingFunnel({ ...funnel });
    setEditingSteps(
      funnel.funnel_steps.length > 0
        ? funnel.funnel_steps.map((s) => ({ ...s }))
        : [{ ...EMPTY_STEP(), html_content: DEFAULT_HTML }]
    );
    setExpandedStep(0);
    setPreviewMode(false);
  };

  const cancelEdit = () => {
    setEditingFunnel(null);
    setEditingSteps([]);
    setExpandedStep(null);
    setHtmlPreviewStep(null);
  };

  const saveFunnel = async () => {
    if (!editingFunnel?.name?.trim()) {
      setError('Funnel name is required');
      return;
    }
    if (editingSteps.length === 0) {
      setError('Add at least one step');
      return;
    }
    for (const s of editingSteps) {
      if (!s.name.trim()) {
        setError('Each step must have a name');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: editingFunnel.name,
        description: editingFunnel.description ?? '',
        trigger_product_id: editingFunnel.trigger_product_id ?? '',
        is_active: editingFunnel.is_active ?? true,
        slug: (editingFunnel as any).slug || '',
        steps: editingSteps.map((s, idx) => ({ ...s, step_order: idx + 1 })),
      };

      const isNew = !editingFunnel.id;
      const url = isNew ? '/api/upsell/funnels' : `/api/upsell/funnels/${editingFunnel.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Save failed');
      }

      await fetchFunnels();
      cancelEdit();
      showSuccess(isNew ? 'Funnel created!' : 'Funnel updated!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save funnel');
    } finally {
      setSaving(false);
    }
  };

  const deleteFunnel = async (id: string) => {
    if (!confirm('Delete this funnel? This cannot be undone.')) return;
    try {
      await fetch(`/api/upsell/funnels/${id}`, { method: 'DELETE' });
      await fetchFunnels();
      showSuccess('Funnel deleted');
    } catch {
      setError('Failed to delete funnel');
    }
  };

  const toggleFunnelActive = async (funnel: Funnel) => {
    try {
      await fetch(`/api/upsell/funnels/${funnel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...funnel, is_active: !funnel.is_active }),
      });
      await fetchFunnels();
    } catch {
      setError('Failed to toggle funnel');
    }
  };

  const copyUpsellUrl = (funnelId: string) => {
    const url = `${siteUrl}/upsell?funnel_id=${funnelId}&session_id=CHECKOUT_SESSION_ID`;
    navigator.clipboard.writeText(url);
    showSuccess('URL copied! Replace CHECKOUT_SESSION_ID with {CHECKOUT_SESSION_ID} in Stripe success URL');
  };

  // ── Step Editing ─────────────────────────────────────────────────────────────

  const addStep = () => {
    const newOrder = editingSteps.length + 1;
    setEditingSteps((prev) => [
      ...prev,
      { ...EMPTY_STEP(), step_order: newOrder, html_content: DEFAULT_HTML },
    ]);
    setExpandedStep(editingSteps.length);
  };

  const removeStep = (idx: number) => {
    setEditingSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
    setExpandedStep(null);
  };

  const moveStep = (idx: number, dir: 'up' | 'down') => {
    const newSteps = [...editingSteps];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newSteps.length) return;
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
    setEditingSteps(newSteps.map((s, i) => ({ ...s, step_order: i + 1 })));
    setExpandedStep(swapIdx);
  };

  const updateStep = (idx: number, field: keyof FunnelStep, value: unknown) => {
    setEditingSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upsell Funnel Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build post-checkout upsell sequences. Customers are charged 1-click with their saved card — no re-entry.
          </p>
        </div>
        {!editingFunnel && (
          <button
            onClick={openNewFunnel}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            New Funnel
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* ── Editor ── */}
      {editingFunnel && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-foreground">
              {editingFunnel.id ? 'Edit Funnel' : 'New Funnel'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  previewMode
                    ? 'bg-primary/10 border-primary/30 text-primary' :'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye size={13} />
                {previewMode ? 'Hide Preview' : 'Flow Preview'}
              </button>
              <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Funnel Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Funnel Name *</label>
                <input
                  type="text"
                  value={editingFunnel.name ?? ''}
                    onChange={(e) => {
                      const name = e.target.value;
                      setEditingFunnel((prev) => {
                        const f = prev as any;
                        // Auto-generate slug if this is a new funnel (no id) or slug was not manually edited
                        const slugWasAutoGen = !f.id || f._slugAutoGen;
                        const newSlug = slugWasAutoGen
                          ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                          : (f.slug ?? '');
                        return { ...f, name, slug: newSlug, _slugAutoGen: slugWasAutoGen };
                      });
                    }}
                  placeholder="e.g. Post-Purchase Upsell Flow"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Funnel Slug
                  <span className="text-muted-foreground font-normal ml-1">(URL: /funnel/<span className="text-primary">{(editingFunnel as any).slug || 'your-slug'}</span>)</span>
                </label>
                <input
                  type="text"
                  value={(editingFunnel as any).slug ?? ''}
                  onChange={(e) => setEditingFunnel((prev) => ({ ...(prev as any), slug: e.target.value, _slugAutoGen: false }))}
                  placeholder="e.g. summer-sale-2026"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Trigger Product ID (Stripe)</label>
                <input
                  type="text"
                  value={editingFunnel.trigger_product_id ?? ''}
                  onChange={(e) => setEditingFunnel((f) => ({ ...f, trigger_product_id: e.target.value }))}
                  placeholder="prod_xxx (optional)"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                <input
                  type="text"
                  value={editingFunnel.description ?? ''}
                  onChange={(e) => setEditingFunnel((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Internal notes about this funnel"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Flow Preview */}
            {previewMode && editingSteps.length > 0 && (
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Sequence Flow</p>
                <div className="flex flex-wrap items-center gap-2">
                  {editingSteps.map((step, idx) => {
                    const cfg = STEP_TYPE_CONFIG[step.step_type];
                    const Icon = cfg.icon;
                    const isActive = previewStepIdx === idx;
                    return (
                      <React.Fragment key={idx}>
                        <button
                          onClick={() => setPreviewStepIdx(idx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            isActive ? cfg.bg + ' ' + cfg.color : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          <Icon size={12} />
                          <span>Step {idx + 1}</span>
                          <span className="opacity-70">{step.name || 'Unnamed'}</span>
                        </button>
                        {idx < editingSteps.length - 1 && (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-emerald-400">✓ accept</span>
                            <ArrowRight size={14} className="text-muted-foreground" />
                            <span className="text-[10px] text-amber-400">✗ decline</span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                    <CheckCircle size={12} />
                    Thank You
                  </div>
                </div>
                {editingSteps[previewStepIdx] && (
                  <div className="mt-3 p-3 bg-background rounded-lg border border-border text-xs space-y-1">
                    <p className="font-medium text-foreground">{editingSteps[previewStepIdx].name || 'Unnamed Step'}</p>
                    <p className="text-muted-foreground">
                      Type: <span className={STEP_TYPE_CONFIG[editingSteps[previewStepIdx].step_type].color}>
                        {STEP_TYPE_CONFIG[editingSteps[previewStepIdx].step_type].label}
                      </span>
                      {' · '}Price: ${(editingSteps[previewStepIdx].price_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-muted-foreground">
                      Accept → Step {editingSteps[previewStepIdx].accept_next_step_order ?? 'End'}
                      {' · '}
                      Decline → Step {editingSteps[previewStepIdx].decline_next_step_order ?? 'End'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Funnel Steps</p>
                <button
                  onClick={addStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/30 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Plus size={13} />
                  Add Step
                </button>
              </div>

              {editingSteps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  No steps yet. Click "Add Step" to build your funnel.
                </div>
              )}

              <div className="space-y-3">
                {editingSteps.map((step, idx) => {
                  const cfg = STEP_TYPE_CONFIG[step.step_type];
                  const Icon = cfg.icon;
                  const isExpanded = expandedStep === idx;

                  return (
                    <div key={idx} className={`border rounded-xl overflow-hidden transition-all ${cfg.bg}`}>
                      {/* Step Header */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => setExpandedStep(isExpanded ? null : idx)}
                      >
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full bg-background border ${cfg.color} text-xs font-bold`}>
                          {idx + 1}
                        </div>
                        <Icon size={15} className={cfg.color} />
                        <span className="flex-1 text-sm font-medium text-foreground truncate">
                          {step.name || <span className="text-muted-foreground italic">Unnamed step</span>}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          ${(step.price_cents / 100).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStep(idx, 'up'); }}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-background/50 disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStep(idx, 'down'); }}
                            disabled={idx === editingSteps.length - 1}
                            className="p-1 rounded hover:bg-background/50 disabled:opacity-30"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeStep(idx); }}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {isExpanded ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                      </div>

                      {/* Step Body */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4 bg-background/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Step Name *</label>
                              <input
                                type="text"
                                value={step.name}
                                onChange={(e) => updateStep(idx, 'name', e.target.value)}
                                placeholder="e.g. Premium Upgrade"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Step Type</label>
                              <select
                                value={step.step_type}
                                onChange={(e) => updateStep(idx, 'step_type', e.target.value as StepType)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="upsell">⚡ Upsell</option>
                                <option value="downsell">📉 Downsell</option>
                                <option value="cross_sell">🛍 Cross-sell</option>
                                <option value="order_bump">🎁 Order Bump</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Price (USD)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={(step.price_cents / 100).toFixed(2)}
                                  onChange={(e) => updateStep(idx, 'price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                                  className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Sequence Logic */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                <span className="text-emerald-400">✓ Accept</span> → Go to Step #
                              </label>
                              <select
                                value={step.accept_next_step_order ?? ''}
                                onChange={(e) => updateStep(idx, 'accept_next_step_order', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="">End Funnel (Thank You)</option>
                                {editingSteps.map((_, i) => i !== idx && (
                                  <option key={i} value={i + 1}>Step {i + 1}{editingSteps[i].name ? ` — ${editingSteps[i].name}` : ''}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                <span className="text-amber-400">✗ Decline</span> → Go to Step #
                              </label>
                              <select
                                value={step.decline_next_step_order ?? ''}
                                onChange={(e) => updateStep(idx, 'decline_next_step_order', e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="">End Funnel (Thank You)</option>
                                {editingSteps.map((_, i) => i !== idx && (
                                  <option key={i} value={i + 1}>Step {i + 1}{editingSteps[i].name ? ` — ${editingSteps[i].name}` : ''}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* HTML Editor */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                Offer Page HTML
                              </label>
                              <button
                                onClick={() => setHtmlPreviewStep(htmlPreviewStep === idx ? null : idx)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Eye size={12} />
                                {htmlPreviewStep === idx ? 'Hide Preview' : 'Preview HTML'}
                              </button>
                            </div>
                            <textarea
                              value={step.html_content}
                              onChange={(e) => updateStep(idx, 'html_content', e.target.value)}
                              rows={10}
                              placeholder="Paste your custom HTML offer page here..."
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">
                              wiastro will inject Accept and Decline buttons automatically. Use <code className="bg-muted px-1 rounded">{'{{PRICE}}'}</code> and <code className="bg-muted px-1 rounded">{'{{DESCRIPTION}}'}</code> as placeholders.
                            </p>
                            {htmlPreviewStep === idx && step.html_content && (
                              <div className="mt-2 border border-border rounded-lg overflow-hidden">
                                <div className="px-3 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground">HTML Preview</div>
                                <iframe
                                  srcDoc={step.html_content}
                                  className="w-full h-64 bg-white"
                                  sandbox="allow-same-origin"
                                  title={`Preview step ${idx + 1}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button onClick={cancelEdit} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={saveFunnel}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                <Save size={15} />
                {saving ? 'Saving...' : 'Save Funnel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Funnel List ── */}
      {!editingFunnel && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : funnels.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Zap size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-foreground font-medium">No funnels yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create your first upsell funnel to start monetizing post-checkout
              </p>
              <button
                onClick={openNewFunnel}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Create First Funnel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {funnels.map((funnel) => (
                <div key={funnel.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{funnel.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${funnel.is_active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {funnel.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {funnel.description && (
                        <p className="text-xs text-muted-foreground mb-2">{funnel.description}</p>
                      )}
                      {/* Step pills */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {funnel.funnel_steps.map((step, idx) => {
                          const cfg = STEP_TYPE_CONFIG[step.step_type];
                          const Icon = cfg.icon;
                          return (
                            <React.Fragment key={step.id ?? idx}>
                              <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                <Icon size={10} />
                                {step.name} · ${(step.price_cents / 100).toFixed(2)}
                              </span>
                              {idx < funnel.funnel_steps.length - 1 && (
                                <ArrowDown size={12} className="text-muted-foreground self-center" />
                              )}
                            </React.Fragment>
                          );
                        })}
                        {funnel.funnel_steps.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No steps configured</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyUpsellUrl(funnel.id)}
                        title="Copy upsell URL"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => toggleFunnelActive(funnel)}
                        title={funnel.is_active ? 'Deactivate' : 'Activate'}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {funnel.is_active ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => openEditFunnel(funnel)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => deleteFunnel(funnel.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Integration Guide */}
          <div className="bg-muted/20 border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap size={15} className="text-primary" />
              How to Connect Your Funnel
            </h3>
            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
              <li>In Stripe, set your Checkout Session <code className="bg-muted px-1 rounded">payment_intent_data.setup_future_usage = &quot;off_session&quot;</code> and <code className="bg-muted px-1 rounded">customer_creation = &quot;always&quot;</code></li>
              <li>Set your Stripe success URL to: <code className="bg-muted px-1 rounded">{siteUrl}/upsell?session_id={'{'}CHECKOUT_SESSION_ID{'}'}</code></li>
              <li>Create a funnel above and activate it — it will auto-trigger after any checkout</li>
              <li>Customers are charged 1-click with their saved card — no re-entry required</li>
            </ol>
          </div>

          <FunnelDashboardTabs funnels={funnels} storeId={storeId} />
        </>
      )}
    </div>
  );
}
