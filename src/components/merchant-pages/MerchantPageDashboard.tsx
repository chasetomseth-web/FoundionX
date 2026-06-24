'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import BackButton from '@/components/ui/back-button';

interface PageSummary {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
}

interface MerchantPageDashboardProps {
  initialPages: PageSummary[];
  defaultStoreId?: string | null;
}

export default function MerchantPageDashboard({ initialPages, defaultStoreId }: MerchantPageDashboardProps) {
  const [pages, setPages] = useState<PageSummary[]>(initialPages);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeId = useMemo(() => defaultStoreId ?? undefined, [defaultStoreId]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Page name is required');
      return;
    }
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/merchant-pages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, storeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Unable to create page');
        return;
      }
      setPages((current) => [{ ...data.page }, ...current]);
      setName('');
    } catch (createError) {
      console.error('[MERCHANT PAGES] create page failed', createError);
      setError('Failed to create page');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(pageId: string) {
    if (!window.confirm('Delete this page? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/merchant-pages/${pageId}${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Unable to delete page');
        return;
      }
      setPages((current) => current.filter((page) => page.id !== pageId));
    } catch (deleteError) {
      console.error('[MERCHANT PAGES] delete page failed', deleteError);
      setError('Failed to delete page');
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BackButton />
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Merchant Pages</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Visual funnel pages for merchants</h1>
          <p className="mt-2 text-slate-600">Create pages, edit nested blocks, and save composable funnels backed by Postgres.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create new page</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New Merchant Page name"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              />
              <button
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Page'}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            <p className="mt-4 text-sm text-slate-500">Pages are attached to the first available store and are saved as nested block trees.</p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Existing pages</h2>
              <span className="text-sm text-slate-500">{pages.length} pages</span>
            </div>
            <div className="mt-5 space-y-3">
              {pages.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
                  No Merchant Pages yet. Create one to start editing.
                </div>
              ) : (
                pages.map((page) => (
                  <div key={page.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{page.name}</p>
                        <p className="mt-1 text-sm text-slate-500">slug: {page.slug}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/merchant-pages/editor/${page.id}${storeId ? `?storeId=${storeId}` : ''}`}
                          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(page.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">Updated {new Date(page.updatedAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">How it works</h2>
            <p className="mt-3 text-slate-600">Create a page and open the editor to add, nest, and reorder blocks visually. The system saves a JSON block tree to PostgreSQL.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
