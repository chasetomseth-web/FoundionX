'use client';

import React, { useState, useRef } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Package, AlertTriangle, DollarSign, Archive, RefreshCw, Plus, ExternalLink, AlertCircle } from 'lucide-react';
import { useProducts, useCreateStripeProduct, type LiveProduct } from '@/hooks/useProducts';
import ProductsTable from './ProductsTable';
import ProductDetailPanel from './ProductDetailPanel';
import ProductsFilters from './ProductsFilters';
import type { Product } from './productsData';
import BackButton from '@/components/ui/back-button';

// Adapt LiveProduct to legacy Product shape for table
function adaptProduct(p: LiveProduct): Product {
  const price = typeof p.price === 'string' ? parseFloat(p.price) : (p.price ?? 0);
  return {
    id: p.id,
    name: p.name,
    sku: p.sku ?? '',
    price,
    compareAtPrice: null,
    inventory: p.inventoryQuantity ?? 0,
    category: p.isRecurring ? 'Subscription' : 'One-time',
    status: (p.status as Product['status']) ?? 'draft',
    type: (p.type as Product['type']) ?? 'physical',
    images: p.images?.map((i) => i.url) ?? [],
    description: p.description ?? '',
    tags: p.tags?.map((t) => t.tag) ?? [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    sales: p._count?.orderItems ?? 0,
    revenue: 0,
    hasUpsell: p.hasUpsell,
    hasOrderBump: p.hasOrderBump,
  };
}

interface NewProductForm {
  name: string;
  description: string;
  imageBase64: string | null;
  imageFileName: string | null;
  category: string;
  pricingType: 'recurring' | 'one-off';
  amount: string;
  currency: string;
  includeTax: boolean;
  taxBehavior: 'unspecified' | 'inclusive' | 'exclusive';
  interval: string;
  intervalCount: number;
}

export default function ProductsPageContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<LiveProduct | null>(null);
  const [page, setPage] = useState(1);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newForm, setNewForm] = useState<NewProductForm>({
    name: '',
    description: '',
    imageBase64: null,
    imageFileName: null,
    category: 'txcd_10000000', // General - Services
    pricingType: 'one-off',
    amount: '',
    currency: 'usd',
    includeTax: false,
    taxBehavior: 'unspecified',
    interval: 'month',
    intervalCount: 1,
  });
  const [createStatus, setCreateStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [createError, setCreateError] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const isCreatingRef = useRef(false);
  const [taxCodes, setTaxCodes] = useState<Array<{ id: string; name: string; description: string }>>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFieldErrors((prev) => ({ ...prev, image: "Only JPEG, PNG, or WEBP allowed" }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, image: "Image must be under 2MB" }));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = () => {
      setNewForm((f) => ({ ...f, imageBase64: reader.result as string, imageFileName: file.name }));
      setImagePreviewUrl(previewUrl);
      setFieldErrors((prev) => ({ ...prev, image: undefined }));
    };
    reader.readAsDataURL(file);
  };

  // Fetch tax codes on mount
  React.useEffect(() => {
    fetch('/api/stripe/tax-codes')
      .then((res) => res.json())
      .then((data) => {
        if (data.taxCodes) {
          setTaxCodes(data.taxCodes);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tax codes:', err);
      });
  }, []);

  const { data, isLoading, isFetching, error } = useProducts({
    page,
    limit: 25,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    includeArchived: showArchived || undefined,
  });

  const createProduct = useCreateStripeProduct();

  const liveProducts = data?.products ?? [];
  const products = liveProducts.map(adaptProduct);
  const total = data?.total ?? 0;

  const activeCount = liveProducts.filter((p) => p.stripeActive ?? p.status === 'active').length;
  const inactiveCount = liveProducts.filter((p) => !(p.stripeActive ?? p.status === 'active')).length;
  const recurringCount = liveProducts.filter((p) => p.isRecurring).length;

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    
    if (!newForm.name.trim()) {
      errors.name = 'Product name is required';
    }
    
    const amount = parseFloat(newForm.amount);
    if (!newForm.amount || isNaN(amount) || amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (isCreatingRef.current) return;
    if (!validateForm()) return;
    isCreatingRef.current = true;
    
    setCreateStatus('saving');
    setCreateError('');
    setFieldErrors({});
    
    try {
      const amount = parseFloat(newForm.amount);
      
      await createProduct.mutateAsync({
        name: newForm.name.trim(),
        description: newForm.description.trim() || undefined,
        price: amount,
        currency: newForm.currency,
        recurring: newForm.pricingType === 'recurring',
        interval: newForm.pricingType === 'recurring' ? newForm.interval : undefined,
        interval_count: newForm.pricingType === 'recurring' && newForm.intervalCount > 1 ? newForm.intervalCount : undefined,
        metadata: {
          category: newForm.category,
        },
        images: newForm.imageBase64 ? [newForm.imageBase64] : undefined,
        tax_behavior: newForm.taxBehavior,
      });
      
      isCreatingRef.current = false;
      setCreateStatus('success');
      setTimeout(() => {
        setShowNewProduct(false);
        setCreateStatus('idle');
        setImagePreviewUrl(null);
        setNewForm({
          name: '',
          description: '',
          imageBase64: null,
          imageFileName: null,
          category: 'txcd_10000000',
          pricingType: 'one-off',
          amount: '',
          currency: 'usd',
          includeTax: false,
          taxBehavior: 'unspecified',
          interval: 'month',
          intervalCount: 1,
        });
      }, 2000);
    } catch (err: unknown) {
      isCreatingRef.current = false;
      setCreateStatus('error');
      setCreateError(err instanceof Error ? err.message : 'Failed to create product');
    }
  }

  const stripeNotConfigured = error instanceof Error && error.message.includes('not configured');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {isLoading ? 'Loading from Stripe…' : `${total} products from Stripe`}
            {isFetching && !isLoading && <RefreshCw size={10} className="animate-spin text-primary" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://dashboard.stripe.com/products"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <ExternalLink size={14} />
            Stripe Dashboard
          </a>
          <button
            onClick={() => setShowNewProduct(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>
      </div>

      {/* Stripe not configured warning */}
      {stripeNotConfigured && (
        <div className="flex items-start gap-3 px-4 py-3 bg-warning-bg border border-warning/30 rounded-xl text-warning text-sm">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-500">Stripe is not configured</p>
            <p className="text-xs mt-0.5 text-warning/80">Add your <code className="font-mono">STRIPE_SECRET_KEY</code> in Settings → Integrations to sync products from your Stripe dashboard.</p>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Products" value={isLoading ? '—' : String(activeCount)} subValue="Live in Stripe" icon={Package} />
        <MetricCard label="Subscriptions" value={isLoading ? '—' : String(recurringCount)} subValue="Recurring products" icon={DollarSign} variant="success" />
        <MetricCard label="Inactive" value={isLoading ? '—' : String(inactiveCount)} subValue="Archived in Stripe" icon={AlertTriangle} variant="warning" />
        <MetricCard label="Total Products" value={isLoading ? '—' : String(total)} subValue="All Stripe products" icon={Archive} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <ProductsFilters
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          statusFilter={statusFilter}
          onStatusFilter={(v) => { setStatusFilter(v); setPage(1); }}
          typeFilter={typeFilter}
          onTypeFilter={(v) => { setTypeFilter(v); setPage(1); }}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => { setShowArchived(e.target.checked); setPage(1); }}
            className="rounded"
          />
          Show archived
        </label>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading products from Stripe…</span>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <ProductsTable
          products={products}
          onSelect={(p) => {
            const live = liveProducts.find((lp) => lp.id === p.id) ?? null;
            setSelectedProduct(live);
          }}
        />
      )}

      {/* Pagination */}
      {!isLoading && data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {data.pages} · {total} total</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 px-3 rounded border border-border text-xs font-500 disabled:opacity-40 hover:bg-muted transition-colors">Previous</button>
            <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="h-7 px-3 rounded border border-border text-xs font-500 disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdated={(updated) => setSelectedProduct(updated)}
        />
      )}

      {/* New Product Modal */}
      {showNewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewProduct(false)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl my-8">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-600 text-foreground">New Stripe Product</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Creates product directly in your Stripe dashboard</p>
              </div>
              <button onClick={() => setShowNewProduct(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
              {/* Success Message */}
              {createStatus === 'success' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
                  <AlertCircle size={14} />
                  Product created successfully in Stripe!
                </div>
              )}

              {/* Error Message */}
              {createStatus === 'error' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle size={14} />
                  {createError}
                </div>
              )}

              {/* Product Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-600 text-foreground">Product Information</h3>
                
                {/* Name */}
                <div>
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Product Name *
                  </label>
                  <input
                    className={`w-full bg-muted/50 border ${fieldErrors.name ? 'border-destructive' : 'border-border'} rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30`}
                    value={newForm.name}
                    onChange={(e) => {
                      setNewForm((f) => ({ ...f, name: e.target.value }));
                      setFieldErrors((e) => ({ ...e, name: undefined }));
                    }}
                    onBlur={() => {
                      if (!newForm.name.trim()) {
                        setFieldErrors((e) => ({ ...e, name: 'Product name is required' }));
                      }
                    }}
                    placeholder="e.g. Premium Subscription"
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Description
                  </label>
                  <textarea
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    rows={3}
                    value={newForm.description}
                    onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional product description"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Product Image
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-500 file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WEBP under 2MB</p>
                  {fieldErrors.image && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.image}</p>
                  )}
                  {imagePreviewUrl && (
                    <div className="mt-2 flex flex-col gap-2">
                      <img
                        src={imagePreviewUrl}
                        alt="Product preview"
                        className="w-24 h-24 object-cover rounded-lg border border-border"
                      />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{newForm.imageFileName}</span>
                        <button
                          onClick={() => { setNewForm((f) => ({ ...f, imageBase64: null, imageFileName: null })); setImagePreviewUrl(null); }}
                          className="text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Category */}
                <div>
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Product Category
                  </label>
                  <select
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={newForm.category}
                    onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {taxCodes.map((code) => (
                      <option key={code.id} value={code.id}>
                        {code.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-600 text-foreground">Pricing</h3>

                {/* Pricing Type Toggle */}
                <div>
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Pricing Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewForm((f) => ({ ...f, pricingType: 'one-off', intervalCount: 1 }))}
                      className={`flex-1 px-4 py-2 text-sm font-500 rounded-lg border transition-colors ${
                        newForm.pricingType === 'one-off'
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-transparent text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      One-off
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewForm((f) => ({ ...f, pricingType: 'recurring' }))}
                      className={`flex-1 px-4 py-2 text-sm font-500 rounded-lg border transition-colors ${
                        newForm.pricingType === 'recurring'
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-transparent text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      Recurring
                    </button>
                  </div>
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Amount *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full bg-muted/50 border ${fieldErrors.amount ? 'border-destructive' : 'border-border'} rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30`}
                      value={newForm.amount}
                      onChange={(e) => {
                        setNewForm((f) => ({ ...f, amount: e.target.value }));
                        setFieldErrors((e) => ({ ...e, amount: undefined }));
                      }}
                      onBlur={() => {
                        const amount = parseFloat(newForm.amount);
                        if (!newForm.amount || isNaN(amount) || amount <= 0) {
                          setFieldErrors((e) => ({ ...e, amount: 'Amount must be greater than 0' }));
                        }
                      }}
                      placeholder="0.00"
                    />
                    {fieldErrors.amount && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.amount}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Currency
                    </label>
                    <select
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={newForm.currency}
                      onChange={(e) => setNewForm((f) => ({ ...f, currency: e.target.value }))}
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                      <option value="cad">CAD</option>
                      <option value="aud">AUD</option>
                    </select>
                  </div>
                </div>

                {/* Include Tax & Tax Behavior */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newForm.includeTax}
                      onChange={(e) => setNewForm((f) => ({ ...f, includeTax: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">Include tax in price</span>
                  </label>

                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Tax Behavior
                    </label>
                    <select
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={newForm.taxBehavior}
                      onChange={(e) => setNewForm((f) => ({ ...f, taxBehavior: e.target.value as 'unspecified' | 'inclusive' | 'exclusive' }))}
                    >
                      <option value="unspecified">Auto</option>
                      <option value="inclusive">Inclusive</option>
                      <option value="exclusive">Exclusive</option>
                    </select>
                  </div>
                </div>

                {/* Billing Period (only for recurring) */}
                {newForm.pricingType === 'recurring' && (
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Billing Period
                    </label>
                    <select
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={`${newForm.interval}-${newForm.intervalCount}`}
                      onChange={(e) => {
                        const [interval, count] = e.target.value.split('-');
                        setNewForm((f) => ({
                          ...f,
                          interval,
                          intervalCount: parseInt(count, 10),
                        }));
                      }}
                    >
                      <option value="day-1">Daily</option>
                      <option value="week-1">Weekly</option>
                      <option value="month-1">Monthly</option>
                      <option value="month-3">Every 3 months</option>
                      <option value="month-6">Every 6 months</option>
                      <option value="year-1">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={handleCreate}
                disabled={createStatus === 'saving'}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createStatus === 'saving' ? (
                  <><RefreshCw size={14} className="animate-spin" />Creating in Stripe…</>
                ) : (
                  <><Plus size={14} />Create Product</>
                )}
              </button>
              <button
                onClick={() => setShowNewProduct(false)}
                disabled={createStatus === 'saving'}
                className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground disabled:opacity-50"
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
