'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Eye, FileCode, Plus, Trash2, X,
  Layout, Code2, Variable, ArrowRight,
  Save, Edit, Loader2, BookCopy, ChevronDown, ChevronRight,
  CheckCircle, FileText, Puzzle, Braces, Rocket,
  Home, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import BackButton from '@/components/ui/back-button';
import PageEditor from '@/app/storefront/components/PageEditor';

// ============================================================
// TYPES
// ============================================================

interface PageItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  pageType: string;
  isCore: boolean;
  isTemplate: boolean;
  isPublished: boolean;
  status: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

interface SiteComponent {
  id: string;
  name: string;
  slug: string;
  type: string;
  isGlobal: boolean;
  html: string;
}

interface SiteVariable {
  id: string;
  key: string;
  value: string;
}

interface JourneyStep {
  pageId: string;
  slug: string;
  name: string;
}

type TabId = 'pages' | 'templates' | 'components' | 'variables';

// ============================================================
// CONSTANTS
// ============================================================

const PAGE_TYPE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  homepage: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600' },
  checkout: { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-600' },
  thankyou: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600' },
  thank_you: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600' },
  upsell: { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600' },
  upsell1: { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600' },
  upsell2: { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600' },
  downsell: { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-600' },
  downsell1: { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-600' },
  downsell2: { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-600' },
  product: { border: 'border-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-600' },
  landing: { border: 'border-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-600' },
  template: { border: 'border-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-600' },
};

const PAGE_TYPE_BADGES: Record<string, string> = {
  homepage: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  checkout: 'bg-green-500/10 text-green-600 border-green-500/20',
  thank_you: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  thankyou: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  upsell: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  upsell1: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  upsell2: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  downsell: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  downsell1: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  downsell2: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  product: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  landing: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

// ============================================================
// ALERT CIRCLE SVG COMPONENT
// ============================================================

function AlertCircleSvg({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size ?? 14} height={size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ============================================================
// STATS BAR COMPONENT
// ============================================================

interface StatCardProps {
  count: number;
  label: string;
  icon: React.ElementType;
  borderColor: string;
  iconBg: string;
  iconColor: string;
}

function StatCard({ count, label, icon: Icon, borderColor, iconBg, iconColor }: StatCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 flex items-center gap-4 border-l-4 ${borderColor}`}>
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div>
        <p className="text-2xl font-700 text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ============================================================
// STATUS PILL COMPONENT
// ============================================================

function StatusPill({ isPublished }: { isPublished: boolean }) {
  if (isPublished) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-500 bg-green-500/10 text-green-600 border border-green-500/20">
        <CheckCircle size={8} />
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-500 bg-muted text-muted-foreground border border-border">
      <FileText size={8} />
      Draft
    </span>
  );
}

// ============================================================
// JOURNEY BUILDER COMPONENT
// ============================================================

function JourneyBuilderSection({ pages }: { pages: PageItem[] }) {
  const [journey, setJourney] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJourney();
  }, []);

  const loadJourney = async () => {
    try {
      const res = await fetch('/api/storefront/journey');
      const data = await res.json();
      const steps = Array.isArray(data.steps) ? data.steps : [];
      if (steps.length === 0) {
        setJourney([
          { pageId: '', slug: '/', name: 'Homepage' },
          { pageId: '', slug: '/checkout', name: 'Checkout' },
          { pageId: '', slug: '/checkout/success', name: 'Thank You' },
        ]);
      } else {
        setJourney(steps);
      }
    } catch {
      setJourney([
        { pageId: '', slug: '/', name: 'Homepage' },
        { pageId: '', slug: '/checkout', name: 'Checkout' },
        { pageId: '', slug: '/checkout/success', name: 'Thank You' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/storefront/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: journey }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to save');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeStep = (idx: number) => {
    const requiredSlugs = ['/', '/checkout', '/checkout/success'];
    if (requiredSlugs.includes(journey[idx]?.slug)) return;
    setJourney((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveStep = (idx: number, dir: 'up' | 'down') => {
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= journey.length) return;
    setJourney((prev) => {
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const availablePages = pages.filter(
    (p) => !journey.some((s) => s.pageId === p.id || s.slug === p.slug)
  );

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-border rounded-xl p-6 flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading journey...</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-border rounded-xl overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-background/50">
        <div>
          <p className="text-sm font-600 text-foreground">Customer Journey</p>
          <p className="text-xs text-muted-foreground mt-0.5">Define the order customers flow through pages</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? 'Saving...' : 'Save Order'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-danger/10 border-b border-danger/20 text-xs text-danger flex items-center gap-2">
          <AlertCircleSvg size={12} />
          {error}
        </div>
      )}

      <div className="p-4 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {journey.map((step, idx) => {
            const page = pages.find((p) => p.id === step.pageId || p.slug === step.slug);
            const pageType = page?.pageType ?? page?.type ?? 'landing';
            const typeColor = PAGE_TYPE_COLORS[pageType] ?? PAGE_TYPE_COLORS.landing;
            const isLocked = ['/', '/checkout', '/checkout/success'].includes(step.slug);

            return (
              <React.Fragment key={`${step.slug}-${idx}`}>
                <div className="relative group">
                  <div className={`flex items-center gap-2 bg-background ${typeColor.border} border rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="min-w-0 max-w-[140px]">
                      <p className="text-xs font-600 text-foreground truncate">{step.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-500 ${typeColor.bg} ${typeColor.text} border ${typeColor.border}/20`}>
                          {pageType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move left">
                        <ArrowRight size={10} className="rotate-[-90deg]" />
                      </button>
                      <button onClick={() => moveStep(idx, 'down')} disabled={idx === journey.length - 1} className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move right">
                        <ArrowRight size={10} className="rotate-90" />
                      </button>
                      {!isLocked && (
                        <button onClick={() => removeStep(idx)} className="p-0.5 rounded text-muted-foreground hover:text-danger" title="Remove">
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Add page button between steps - appears on hover */}
                  {idx < journey.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      {availablePages.length > 0 && (
                        <div className="relative">
                          <button className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                            <Plus size={10} />
                          </button>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-20 hidden group-hover:block">
                            <div className="p-1 max-h-40 overflow-y-auto">
                              {availablePages.map((ap) => (
                                <button
                                  key={ap.id}
                                  onClick={() => {
                                    const newStep = { pageId: ap.id, slug: ap.slug, name: ap.name };
                                    setJourney((prev) => [...prev, newStep]);
                                  }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-muted transition-colors"
                                >
                                  <span className="text-muted-foreground">{ap.name}</span>
                                  <span className="text-[9px] text-muted-foreground ml-auto">{ap.slug}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {idx < journey.length - 1 && (
                  <div className="flex items-center mx-1">
                    <div className="w-6 h-px bg-border" />
                    <ArrowRight size={10} className="text-muted-foreground flex-shrink-0 -ml-1" />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Final add button */}
          {availablePages.length > 0 && (
            <div className="ml-2">
              <div className="relative group">
                <button className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                  <Plus size={10} />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-20 hidden group-hover:block">
                  <div className="p-1 max-h-40 overflow-y-auto">
                    {availablePages.map((ap) => (
                      <button
                        key={ap.id}
                        onClick={() => {
                          const newStep = { pageId: ap.id, slug: ap.slug, name: ap.name };
                          setJourney((prev) => [...prev, newStep]);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-muted transition-colors"
                      >
                        <span className="text-muted-foreground">{ap.name}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto">{ap.slug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE CARD COMPONENT
// ============================================================

function PageCard({
  page, onEdit, onDelete, onTogglePublish, showTemplateLabel
}: {
  page: PageItem;
  onEdit: (page: PageItem) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (page: PageItem) => Promise<void>;
  showTemplateLabel?: boolean;
}) {
  const typeKey = page.pageType || page.type || 'landing';
  const typeColor = PAGE_TYPE_COLORS[typeKey] ?? PAGE_TYPE_COLORS.landing;
  const badgeClass = PAGE_TYPE_BADGES[typeKey] ?? 'bg-muted text-muted-foreground border border-border';

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden border-l-4 ${typeColor.border} flex flex-col h-full`}>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-500 border ${badgeClass}`}>
              {typeKey.replace(/_/g, ' ')}
            </span>
            {showTemplateLabel && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-500 border ${PAGE_TYPE_BADGES.template ?? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}>Template</span>
            )}
            {page.isCore && !showTemplateLabel && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Core</span>
            )}
          </div>
          <StatusPill isPublished={page.isPublished} />
        </div>

        <h3 className="text-base font-700 text-foreground mb-1">{page.name}</h3>
        <p className="text-xs font-mono text-muted-foreground mb-3 truncate">{page.slug}</p>

        {showTemplateLabel && page.html && page.html.length > 50 && (
          <p className="text-[10px] text-muted-foreground mb-2 italic">Has template content — ready for use</p>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-2 border-t border-border/50">
          <a
            href={`${siteUrl}${page.slug}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-500 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Preview"
          >
            <Eye size={10} />
            Preview
          </a>
          <button onClick={() => onEdit(page)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-500 border border-border rounded-lg hover:bg-muted transition-colors text-foreground">
            <Edit size={10} />
            Edit
          </button>
          <button
            onClick={async () => { await onTogglePublish(page); }}
            className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-500 rounded-lg transition-colors ${
              page.isPublished
                ? 'bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20'
                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/50'
            }`}
          >
            {page.isPublished ? <CheckCircle size={8} /> : <FileText size={8} />}
            {page.isPublished ? 'Published' : 'Draft'}
          </button>
          {!page.isCore && !showTemplateLabel && (
            <button onClick={() => onDelete(page.id)} className="p-1.5 rounded-lg hover:bg-danger-bg text-muted-foreground hover:text-danger transition-colors" title="Delete">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VARIABLES TAB CONTENT
// ============================================================

const SITE_VARIABLE_FIELDS = [
  { key: 'site.name', label: 'Store Name', placeholder: 'My Store' },
  { key: 'site.phone', label: 'Phone', placeholder: '+1 (555) 123-4567' },
  { key: 'site.email', label: 'Email', placeholder: 'hello@mystore.com' },
  { key: 'site.address', label: 'Address', placeholder: '123 Main St, City, State ZIP' },
  { key: 'site.logo', label: 'Logo URL', placeholder: 'https://example.com/logo.png' },
  { key: 'site.support_email', label: 'Support Email', placeholder: 'support@mystore.com' },
  { key: 'site.facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/mystore' },
  { key: 'site.instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/mystore' },
  { key: 'site.youtube', label: 'YouTube URL', placeholder: 'https://youtube.com/@mystore' },
  { key: 'site.tiktok', label: 'TikTok URL', placeholder: 'https://tiktok.com/@mystore' },
];

const VARIABLE_REFERENCE_GROUPS = [
  { group: 'Site', vars: [
    { name: 'site.name', desc: 'Store name' }, { name: 'site.phone', desc: 'Store phone number' },
    { name: 'site.email', desc: 'Store email address' }, { name: 'site.address', desc: 'Store physical address' },
    { name: 'site.logo', desc: 'Store logo URL' }, { name: 'site.support_email', desc: 'Support email address' },
    { name: 'site.facebook', desc: 'Facebook page URL' }, { name: 'site.instagram', desc: 'Instagram profile URL' },
    { name: 'site.youtube', desc: 'YouTube channel URL' }, { name: 'site.tiktok', desc: 'TikTok profile URL' },
  ]},
  { group: 'Product', vars: [
    { name: 'product.name', desc: 'Product name' }, { name: 'product.price', desc: 'Product price' },
    { name: 'product.price | currency', desc: 'Formatted price' }, { name: 'product.description', desc: 'Product description' },
    { name: 'product.image', desc: 'Product image URL' }, { name: 'product.sku', desc: 'Product SKU' },
  ]},
  { group: 'Funnel', vars: [
    { name: 'next_url', desc: 'Next step URL' }, { name: 'decline_url', desc: 'Decline URL' },
    { name: 'checkout_url', desc: 'Checkout page URL' },
  ]},
  { group: 'Cart', vars: [
    { name: 'cart.total', desc: 'Cart total' }, { name: 'cart.subtotal', desc: 'Cart subtotal' },
    { name: 'cart.itemCount', desc: 'Number of items' },
  ]},
  { group: 'Customer', vars: [
    { name: 'customer.name', desc: 'Customer full name' }, { name: 'customer.first_name', desc: 'Customer first name' },
    { name: 'customer.email', desc: 'Customer email' },
  ]},
  { group: 'Order', vars: [
    { name: 'order.total', desc: 'Order total' }, { name: 'order.number', desc: 'Order number' },
    { name: 'order.date', desc: 'Order date' },
  ]},
  { group: 'Components', vars: [
    { name: 'component.header', desc: 'Header HTML' }, { name: 'component.footer', desc: 'Footer HTML' },
    { name: 'component.cart-flyout', desc: 'Cart flyout HTML' }, { name: 'component.announcement', desc: 'Announcement bar HTML' },
  ]},
  { group: 'Custom', vars: [
    { name: 'variable.*', desc: 'Any user-created custom variable' },
  ]},
];

function VariablesContent({
  sessionVariables, loadVariables, setError
}: {
  sessionVariables: SiteVariable[];
  loadVariables: () => Promise<void>;
  setError: (msg: string | null) => void;
}) {
  const siteVars = sessionVariables.filter((v) => v.key.startsWith('site.'));
  const customVars = sessionVariables.filter((v) => !v.key.startsWith('site.'));

  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of SITE_VARIABLE_FIELDS) {
      const existing = siteVars.find((v) => v.key === f.key);
      initial[f.key] = existing?.value ?? '';
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [newCustomKey, setNewCustomKey] = useState('');
  const [newCustomValue, setNewCustomValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSaveSiteVars = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(formValues).map(([key, value]) => ({ key, value }));
      const res = await fetch('/api/pagebuilder/variables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to save');
      await loadVariables();
    } catch {
      setError('Failed to save site variables');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomVar = async () => {
    if (!newCustomKey.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/pagebuilder/variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newCustomKey, value: newCustomValue }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setNewCustomKey('');
      setNewCustomValue('');
      await loadVariables();
    } catch {
      setError('Failed to add custom variable');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteCustomVar = async (id: string) => {
    if (!confirm('Delete this custom variable?')) return;
    try {
      const res = await fetch(`/api/pagebuilder/variables/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await loadVariables();
    } catch {
      setError('Failed to delete custom variable');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(`{{${text}}}`).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* Section 1 — Site Variables */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-600 text-foreground">Site Variables</p>
            <p className="text-xs text-muted-foreground mt-0.5">Used as {'{{site.*}}'} in templates</p>
          </div>
          <button onClick={handleSaveSiteVars} disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {SITE_VARIABLE_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-500 text-muted-foreground mb-1">
                <code className="text-[10px] bg-muted px-1 rounded">{field.key}</code>
              </label>
              <input type="text" value={formValues[field.key] ?? ''}
                onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 — Custom Variables */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-600 text-foreground">Custom Variables</p>
          <p className="text-xs text-muted-foreground mt-0.5">Used as {'{{variable.*}}'} in templates</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input type="text" value={newCustomKey}
              onChange={(e) => setNewCustomKey(e.target.value)}
              placeholder="e.g. promo_code (auto-prefixed with variable.)"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input type="text" value={newCustomValue}
              onChange={(e) => setNewCustomValue(e.target.value)}
              placeholder="Value"
              className="w-40 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button onClick={handleAddCustomVar} disabled={!newCustomKey.trim() || adding}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-500 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>

          {customVars.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No custom variables yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {customVars.map((v) => (
                <div key={v.id} className="flex items-center gap-3 py-2">
                  <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground flex-shrink-0">{v.key}</code>
                  <span className="text-xs text-muted-foreground flex-1 truncate">{v.value}</span>
                  <button onClick={() => handleDeleteCustomVar(v.id)}
                    className="p-1 rounded text-muted-foreground hover:text-danger transition-colors flex-shrink-0" title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 3 — Variable Reference Panel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button onClick={() => setShowRef(!showRef)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Variable size={14} className="text-muted-foreground" />
            <p className="text-sm font-600 text-foreground">All Available Variables</p>
          </div>
          {showRef ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </button>

        {showRef && (
          <div className="px-4 pb-4 max-h-96 overflow-y-auto space-y-3">
            {VARIABLE_REFERENCE_GROUPS.map((group) => (
              <div key={group.group}>
                <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-1">{group.group}</p>
                <div className="space-y-1 pl-2">
                  {group.vars.map((v) => (
                    <div key={v.name} className="flex items-center gap-2 group/var">
                      <code onClick={() => copyToClipboard(v.name)}
                        className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
                        title="Click to copy"
                      >
                        {v.name}
                      </code>
                      <span className="text-[10px] text-muted-foreground flex-1">{v.desc}</span>
                      {copied === v.name && <span className="text-[9px] text-success flex-shrink-0">Copied!</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGEBUILDER CONTENT
// ============================================================

export default function PagebuilderContent() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [components, setComponents] = useState<SiteComponent[]>([]);
  const [variables, setVariables] = useState<SiteVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<PageItem | null>(null);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('pages');

  const loadPages = useCallback(async () => {
    try {
      const res = await fetch('/api/pagebuilder/pages');
      const data = await res.json();
      setPages(data.pages ?? []);
    } catch { /* silent */ }
  }, []);

  const loadComponents = useCallback(async () => {
    try {
      const res = await fetch('/api/pagebuilder/components');
      const data = await res.json();
      setComponents(data.components ?? []);
    } catch { /* silent */ }
  }, []);

  const loadVariables = useCallback(async () => {
    try {
      const res = await fetch('/api/pagebuilder/variables');
      const data = await res.json();
      // Merge siteVariables and customVariables into a flat array
      const merged: SiteVariable[] = [];
      if (Array.isArray(data.siteVariables)) {
        for (const sv of data.siteVariables) {
          merged.push({ id: sv.id, key: sv.key, value: sv.value });
        }
      }
      if (Array.isArray(data.customVariables)) {
        for (const cv of data.customVariables) {
          merged.push({ id: cv.id, key: cv.key, value: cv.value });
        }
      }
      setVariables(merged);
    } catch { /* silent */ }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPages(), loadComponents(), loadVariables()]);
    setLoading(false);
  }, [loadPages, loadComponents, loadVariables]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreatePage = async () => {
    if (!newPageName.trim() || !newPageSlug.trim()) {
      setError('Name and slug are required');
      return;
    }
    try {
      const res = await fetch('/api/pagebuilder/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPageName, slug: newPageSlug.startsWith('/') ? newPageSlug : '/' + newPageSlug, type: 'landing' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create page');
      }
      setShowNewPageModal(false);
      setNewPageName('');
      setNewPageSlug('');
      await loadPages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure? This page will be deleted.')) return;
    try {
      const res = await fetch(`/api/pagebuilder/pages/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to delete');
      }
      await loadPages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
    }
  };

  const handleTogglePublish = async (page: PageItem) => {
    try {
      await fetch(`/api/pagebuilder/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !page.isPublished }),
      });
      await loadPages();
    } catch {
      setError('Failed to toggle publish status');
    }
  };

  const handleGoLive = async () => {
    const cp = pages.filter((p) => p.isCore && ['homepage', 'checkout', 'thanyou', 'thank_you'].includes(p.pageType || p.type));
    const emptyCore = cp.filter((p) => !p.html || p.html.trim() === '');
    if (emptyCore.length > 0) {
      setError(emptyCore.map((p) => p.name).join(', ') + ' must have content before going live');
      return;
    }
    setPublishing(true);
    try {
      await Promise.all(
        pages.filter((p) => !p.isPublished).map((p) =>
          fetch(`/api/pagebuilder/pages/${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublished: true }),
          })
        )
      );
      await loadPages();
    } catch {
      setError('Failed to publish some pages');
    } finally {
      setPublishing(false);
    }
  };

  if (editingPage) {
    return <PageEditor page={editingPage} onBack={() => setEditingPage(null)} onSaved={loadPages} />;
  }

  // Derived data
  const corePages = pages.filter((p) => p.isCore);
  const landingPages = pages.filter((p) => !p.isCore && !p.isTemplate);
  const templates = pages.filter((p) => p.isTemplate || p.slug.startsWith('_template'));
  const publishedCount = pages.filter((p) => p.isPublished).length;
  const draftCount = pages.length - publishedCount;

  const TABS: Array<{ id: TabId; label: string; icon: React.ElementType; count: number; color: string }> = [
    { id: 'pages', label: 'Pages', icon: Layout, count: corePages.length + landingPages.length, color: 'border-blue-500 text-blue-600' },
    { id: 'templates', label: 'Templates', icon: BookCopy, count: templates.length, color: 'border-indigo-500 text-indigo-600' },
    { id: 'components', label: 'Components', icon: Code2, count: components.length, color: 'border-sky-500 text-sky-600' },
    { id: 'variables', label: 'Variables', icon: Variable, count: variables.length, color: 'border-purple-500 text-purple-600' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Home size={12} />
        <ChevronRightIcon size={10} />
        <span>Storefront</span>
        <ChevronRightIcon size={10} />
        <span className="text-foreground font-500">Pagebuilder</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Pagebuilder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage pages, templates, components and variables for your storefront</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewPageModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> New Page
          </button>
          <button onClick={handleGoLive} disabled={publishing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-500 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
            {publishing ? 'Publishing...' : 'Go Live'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard count={publishedCount} label="Published Pages" icon={CheckCircle} borderColor="border-l-green-500" iconBg="bg-green-500/10" iconColor="text-green-600" />
        <StatCard count={draftCount} label="Draft Pages" icon={FileText} borderColor="border-l-gray-400" iconBg="bg-gray-500/10" iconColor="text-gray-500" />
        <StatCard count={components.length} label="Components" icon={Puzzle} borderColor="border-l-blue-500" iconBg="bg-blue-500/10" iconColor="text-blue-600" />
        <StatCard count={variables.length} label="Variables" icon={Braces} borderColor="border-l-purple-500" iconBg="bg-purple-500/10" iconColor="text-purple-600" />
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-bg border border-danger/20 rounded-xl p-3 text-xs text-danger flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-500 border-b-2 transition-colors ${
                  isActive
                    ? `${tab.color} border-b-current`
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <Icon size={12} /> {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'
                  }`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-sm text-muted-foreground">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading...
        </div>
      ) : (
        <>
          {/* PAGES TAB */}
          {activeTab === 'pages' && (
            <div className="space-y-6">
              {corePages.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={14} className="text-muted-foreground" />
                    <p className="text-sm font-600 text-foreground">Core Pages</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{corePages.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {corePages.map((page) => (
                      <PageCard key={page.id} page={page} onEdit={setEditingPage} onDelete={handleDeletePage} onTogglePublish={handleTogglePublish} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileCode size={14} className="text-muted-foreground" />
                    <p className="text-sm font-600 text-foreground">Landing Pages</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{landingPages.length}</span>
                  </div>
                  <button onClick={() => setShowNewPageModal(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-500 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <Plus size={10} /> New Landing Page
                  </button>
                </div>
                {landingPages.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-10 text-center">
                    <div className="w-14 h-14 rounded-xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                      <FileCode size={24} className="text-pink-500" />
                    </div>
                    <p className="text-sm font-500 text-foreground mb-1">No landing pages yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Create your first landing page to start building your storefront.</p>
                    <button onClick={() => setShowNewPageModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-xs font-500 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Plus size={12} /> New Landing Page
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {landingPages.map((page) => (
                      <PageCard key={page.id} page={page} onEdit={setEditingPage} onDelete={handleDeletePage} onTogglePublish={handleTogglePublish} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <div>
              {templates.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-10 text-center">
                  <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                    <BookCopy size={24} className="text-indigo-500" />
                  </div>
                  <p className="text-sm font-500 text-foreground mb-1">No templates yet</p>
                  <p className="text-xs text-muted-foreground">Templates are _template/* pages that can be reused across your storefront.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((page) => (
                    <PageCard key={page.id} page={page} onEdit={setEditingPage} onDelete={handleDeletePage} onTogglePublish={handleTogglePublish} showTemplateLabel />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMPONENTS TAB */}
          {activeTab === 'components' && (
            <div>
              {components.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-10 text-center">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <Code2 size={24} className="text-blue-500" />
                  </div>
                  <p className="text-sm font-500 text-foreground mb-1">No components yet</p>
                  <p className="text-xs text-muted-foreground">Components are reusable HTML snippets like headers, footers, and more.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {components.map((comp) => (
                    <div key={comp.id} className="bg-card border border-border border-l-4 border-l-blue-500 rounded-xl p-4 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-600 text-foreground">{comp.name}</h3>
                          <p className="text-xs font-mono text-muted-foreground truncate">{comp.slug}</p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-500 border flex-shrink-0 ml-2 ${
                          comp.isGlobal ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {comp.isGlobal ? 'Global' : comp.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-auto">
                        {comp.html ? comp.html.substring(0, 100) + '...' : 'No content'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VARIABLES TAB */}
          {activeTab === 'variables' && (
            <VariablesContent sessionVariables={variables} loadVariables={loadVariables} setError={setError} />
          )}
        </>
      )}

      {/* Customer Journey Section */}
      <JourneyBuilderSection pages={pages} />

      {/* New Page Modal */}
      {showNewPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewPageModal(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-xl p-5">
            <p className="text-sm font-600 text-foreground mb-4">Create New Page</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-500 text-muted-foreground block mb-1">Page Name</label>
                <input type="text" value={newPageName}
                  onChange={(e) => {
                    setNewPageName(e.target.value);
                    if (!newPageSlug) {
                      setNewPageSlug('/' + e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                    }
                  }}
                  placeholder="My Page"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-500 text-muted-foreground block mb-1">Slug</label>
                <input type="text" value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  placeholder="/my-page"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button onClick={handleCreatePage} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-500">Create Page</button>
              <button onClick={() => setShowNewPageModal(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}