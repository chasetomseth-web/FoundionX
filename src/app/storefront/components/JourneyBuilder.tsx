'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, Trash2, GripVertical, Save, Loader2, AlertCircle } from 'lucide-react';

interface JourneyStep {
  pageId: string;
  slug: string;
  name: string;
}

interface Page {
  id: string;
  name: string;
  slug: string;
  pageType: string;
  isCore: boolean;
  status: string;
}

const PAGE_TYPE_BADGES: Record<string, string> = {
  homepage: 'bg-blue-500/10 text-blue-500',
  checkout: 'bg-green-500/10 text-green-500',
  thank_you: 'bg-purple-500/10 text-purple-500',
  upsell: 'bg-amber-500/10 text-amber-500',
  downsell: 'bg-orange-500/10 text-orange-500',
  landing: 'bg-primary/10 text-primary',
};

const REQUIRED_STEPS = ['/', '/checkout', '/checkout/success'];

export default function JourneyBuilder({ pages }: { pages: Page[] }) {
  const [journey, setJourney] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const loadJourney = async () => {
      try {
        const res = await fetch('/api/storefront/journey');
        const data = await res.json();
        setJourney(data.steps ?? []);
      } catch {
        // Default journey
        const homepage = pages.find((p) => p.slug === '/');
        const checkout = pages.find((p) => p.slug === '/checkout');
        const thankYou = pages.find((p) => p.slug === '/checkout/success');
        setJourney([
          homepage ? { pageId: homepage.id, slug: '/', name: 'Homepage' } : { pageId: '', slug: '/', name: 'Homepage' },
          checkout ? { pageId: checkout.id, slug: '/checkout', name: 'Checkout Page' } : { pageId: '', slug: '/checkout', name: 'Checkout Page' },
          thankYou ? { pageId: thankYou.id, slug: '/checkout/success', name: 'Thank You Page' } : { pageId: '', slug: '/checkout/success', name: 'Thank You Page' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadJourney();
  }, [pages]);

  const saveJourney = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/storefront/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: journey }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addStep = (page: Page, afterIndex: number) => {
    const newStep = { pageId: page.id, slug: page.slug, name: page.name };
    setJourney((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newStep);
      return next;
    });
    setShowAddModal(false);
  };

  const removeStep = (idx: number) => {
    if (REQUIRED_STEPS.includes(journey[idx]?.slug)) return;
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
    (p) => !journey.some((s) => s.pageId === p.id) && !REQUIRED_STEPS.includes(p.slug)
  );

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading journey...</span>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-600 text-foreground">Customer Journey</p>
          <p className="text-xs text-muted-foreground mt-0.5">Define the order pages are visited</p>
        </div>
        <button
          onClick={saveJourney}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? 'Saving...' : 'Save Order'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-danger/10 border-b border-danger/20 text-xs text-danger flex items-center gap-2">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Journey Flow */}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {journey.map((step, idx) => {
            const page = pages.find((p) => p.id === step.pageId || p.slug === step.slug);
            const pageType = page?.pageType ?? 'landing';
            const isLocked = REQUIRED_STEPS.includes(step.slug);

            return (
              <React.Fragment key={`${step.slug}-${idx}`}>
                {/* Step Card */}
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                  <GripVertical size={12} className="text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-600 text-foreground truncate">{step.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-500 ${PAGE_TYPE_BADGES[pageType] ?? 'bg-muted text-muted-foreground'}`}>
                        {pageType}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{step.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => moveStep(idx, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowRight size={10} className="rotate-[-90deg]" />
                    </button>
                    <button
                      onClick={() => moveStep(idx, 'down')}
                      disabled={idx === journey.length - 1}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowRight size={10} className="rotate-90" />
                    </button>
                    {!isLocked && (
                      <button
                        onClick={() => removeStep(idx)}
                        className="p-0.5 rounded text-muted-foreground hover:text-danger"
                        title="Remove"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Arrow between steps */}
                {idx < journey.length - 1 && (
                  <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}

          {/* Add Step Button */}
          <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Plus size={12} />
            Add Page
          </button>
        </div>
      </div>

      {/* Add Page Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-xl p-5">
            <p className="text-sm font-600 text-foreground mb-3">Add Page to Journey</p>
            {availablePages.length === 0 ? (
              <p className="text-xs text-muted-foreground">All available pages are already in the journey.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availablePages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => addStep(page, journey.length - 1)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-muted transition-colors"
                  >
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-500 ${PAGE_TYPE_BADGES[page.pageType] ?? 'bg-muted text-muted-foreground'}`}>
                      {page.pageType}
                    </span>
                    <span className="text-sm text-foreground">{page.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{page.slug}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowAddModal(false)}
              className="mt-4 w-full py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}