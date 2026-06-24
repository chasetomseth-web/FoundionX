'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Eye, BarChart2, Plus, FileCode, Zap, Trash2, X, ExternalLink } from 'lucide-react';
import PageEditor from './PageEditor';
import JourneyBuilder from './JourneyBuilder';
import BackButton from '@/components/ui/back-button';

interface StorefrontPage {
  id: string;
  name: string;
  slug: string;
  type: string;
  isCore: boolean;
  isPublished: boolean;
  status: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

const PAGE_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  homepage: { label: 'Homepage', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  checkout: { label: 'Checkout', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  thankyou: { label: 'Thank You', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  upsell1: { label: 'Upsell #1', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  upsell2: { label: 'Upsell #2', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  downsell1: { label: 'Downsell #1', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  downsell2: { label: 'Downsell #2', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  upsell: { label: 'Upsell', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  downsell: { label: 'Downsell', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  landing: { label: 'Landing', className: 'bg-primary/10 text-primary border-primary/20' },
};

const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

export default function StorefrontPageContent() {
  const [pages, setPages] = useState<StorefrontPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<StorefrontPage | null>(null);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/storefront/pages');
      const data = await res.json();
      setPages(data.pages ?? []);
    } catch {
      setError('Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPages(); }, [loadPages]);

  const handleCreatePage = async () => {
    if (!newPageName.trim() || !newPageSlug.trim()) {
      setError('Name and slug are required');
      return;
    }
    try {
      const res = await fetch('/api/storefront/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPageName, slug: newPageSlug.startsWith('/') ? newPageSlug : `/${newPageSlug}` }),
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
      const res = await fetch(`/api/storefront/pages/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to delete');
      }
      await loadPages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
    }
  };

  const handlePublishAll = async () => {
    // Validate core pages have content
    const corePages = pages.filter((p) => p.isCore && ['homepage', 'checkout', 'thankyou'].includes(p.type));
    const emptyCore = corePages.filter((p) => !p.html || p.html.trim() === '');
    if (emptyCore.length > 0) {
      setError(`${emptyCore.map((p) => p.name).join(', ')} must have content before going live`);
      return;
    }

    setPublishing(true);
    try {
      await Promise.all(
            pages
              .filter((p) => !p.isPublished)
              .map((p) => fetch(`/api/storefront/pages/${p.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: true }),
              }))
      );
      await loadPages();
    } catch {
      setError('Failed to publish some pages');
    } finally {
      setPublishing(false);
    }
  };

  const published = pages.filter((p) => p.isPublished).length;
  const drafts = pages.length - published;
  const corePagesCount = pages.filter((p) => p.isCore).length;

  // If editing a page, show full-screen editor
  if (editingPage) {
    return <PageEditor page={editingPage} onBack={() => setEditingPage(null)} onSaved={loadPages} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Storefront</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your storefront pages and customer journey</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewPageModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            New Landing Page
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-500">Published</p>
          </div>
          <p className="text-2xl font-600 text-foreground">{published}</p>
          <p className="text-xs text-muted-foreground mt-1">{drafts} drafts</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileCode size={14} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-500">Core Pages</p>
          </div>
          <p className="text-2xl font-600 text-foreground">{corePagesCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Homepage, Checkout, Thank You</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-500">Landing Pages</p>
          </div>
          <p className="text-2xl font-600 text-foreground">{pages.filter((p) => !p.isCore).length}</p>
          <p className="text-xs text-muted-foreground mt-1">User-created pages</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileCode size={14} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-500">Rendering Engine</p>
          </div>
          <p className="text-sm font-600 text-success">Active</p>
          <p className="text-xs text-muted-foreground mt-1">SSR + Edge cache</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-bg border border-danger/20 rounded-xl p-3 text-xs text-danger flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Pages List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-600 text-foreground">Storefront Pages</p>
          <button
            onClick={handlePublishAll}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-60"
          >
            <Zap size={12} />
            {publishing ? 'Publishing...' : 'Go Live'}
          </button>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading pages...</div>
          ) : pages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No pages found. Core pages will be created automatically.</div>
          ) : (
            pages.map((page) => {
              const badge = PAGE_TYPE_BADGES[page.type] ?? { label: page.type, className: 'bg-muted text-muted-foreground border-border' };
              const hasContent = page.html && page.html.trim() !== '';
              return (
                <div key={page.id} className="px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  {/* Type Badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-500 border flex-shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>

                  {/* Page Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-500 text-foreground truncate">{page.name}</p>
                      {page.isCore && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Core</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{page.slug}</p>
                  </div>

                  {/* Status */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-500 flex-shrink-0 ${page.isPublished ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
                    {page.isPublished ? 'Published' : 'Draft'}
                  </span>

                  {/* Has Content indicator */}
                  <span className={`text-[9px] flex-shrink-0 ${hasContent ? 'text-success' : 'text-muted-foreground'}`}>
                    {hasContent ? '● Has HTML' : '○ Empty'}
                  </span>

                  {/* Preview button */}
                  <a
                    href={`${siteUrl}${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    title="Preview"
                  >
                    <ExternalLink size={14} />
                  </a>

                  {/* Edit button */}
                  <button
                    onClick={() => setEditingPage(page)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 border border-border rounded-lg hover:bg-muted transition-colors text-foreground flex-shrink-0"
                  >
                    Edit
                  </button>

                  {/* Delete button (non-core only) */}
                  {!page.isCore && (
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="p-1.5 rounded-lg hover:bg-danger-bg text-muted-foreground hover:text-danger transition-colors flex-shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Journey */}
      <JourneyBuilder pages={pages} />

      {/* New Page Modal */}
      {showNewPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewPageModal(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-xl p-5">
            <p className="text-sm font-600 text-foreground mb-4">Create New Landing Page</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-500 text-muted-foreground block mb-1">Page Name</label>
                <input
                  type="text"
                  value={newPageName}
                  onChange={(e) => {
                    setNewPageName(e.target.value);
                    if (!newPageSlug) setNewPageSlug('/' + e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                  }}
                  placeholder="My Landing Page"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-500 text-muted-foreground block mb-1">Slug</label>
                <input
                  type="text"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  placeholder="/my-landing-page"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={handleCreatePage}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-500 hover:bg-primary/90 transition-colors"
              >
                Create Page
              </button>
              <button
                onClick={() => setShowNewPageModal(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}