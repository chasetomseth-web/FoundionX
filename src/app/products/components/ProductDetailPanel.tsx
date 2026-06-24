'use client';

import React, { useState, useRef } from 'react';
import { type LiveProduct, useUpdateProduct, useDeleteProduct, usePatchProduct, type StripePrice } from '@/hooks/useProducts';
import { X, Zap, ShoppingBag, Edit2, Save, XCircle, ExternalLink, RefreshCw, CheckCircle, AlertCircle, Package, Plus, Minus, Trash2, Upload, Camera } from 'lucide-react';

interface Props {
  product: LiveProduct;
  onClose: () => void;
  onUpdated?: (updated: LiveProduct) => void;
}

interface EditForm {
  name: string;
  description: string;
  active: boolean;
  price: string;
  currency: string;
  imageBase64: string | null;
  imageFileName: string | null;
}

export default function ProductDetailPanel({ product, onClose, onUpdated }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: product.name,
    description: product.description ?? '',
    active: product.stripeActive ?? product.status === 'active',
    price: product.stripePrice != null ? String(product.stripePrice) : String(product.price ?? ''),
    currency: product.stripeCurrency ?? 'usd',
    imageBase64: null,
    imageFileName: null,
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'success' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string | null>(null);
  // Whether to show the file input instead of the "Change Image" button overlay
  const [showImageFileInput, setShowImageFileInput] = useState(false);

  // Inventory state
  const [inventoryQty, setInventoryQty] = useState<number>(product.inventoryQuantity ?? 0);
  const [inventoryInput, setInventoryInput] = useState<string>(String(product.inventoryQuantity ?? 0));
  const [inventoryEditMode, setInventoryEditMode] = useState<'set' | 'adjust'>('set');
  const [adjustDelta, setAdjustDelta] = useState<string>('');
  const [inventorySaveStatus, setInventorySaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [inventorySaveError, setInventorySaveError] = useState('');

  const updateProduct = useUpdateProduct();
  const patchProduct = usePatchProduct();
  const deleteProduct = useDeleteProduct();

  const stripeId = product.stripeId ?? product.id;
  const stripeDashboardUrl = `https://dashboard.stripe.com/products/${stripeId}`;

  function openEditModal() {
    setForm({
      name: product.name,
      description: product.description ?? '',
      active: product.stripeActive ?? product.status === 'active',
      price: product.stripePrice != null ? String(product.stripePrice) : String(product.price ?? ''),
      currency: product.stripeCurrency ?? 'usd',
      imageBase64: null,
      imageFileName: null,
    });
    setEditImagePreviewUrl(null);
    setShowImageFileInput(false);
    setShowEditModal(true);
    setSaveStatus('idle');
    setSaveError('');
  }

  function openDeleteModal() {
    setShowDeleteModal(true);
    setDeleteStatus('idle');
    setDeleteError('');
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageBase64: reader.result as string, imageFileName: file.name }));
      setEditImagePreviewUrl(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };

  /** Remove the newly selected image and revert to showing the original / "Change Image" state */
  function handleRemoveNewImage() {
    setForm((f) => ({ ...f, imageBase64: null, imageFileName: null }));
    setEditImagePreviewUrl(null);
    setShowImageFileInput(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /** Upload the base64 image to Supabase Storage via API, return the public URL */
  async function uploadImageToSupabase(base64Data: string, fileName: string): Promise<string> {
    const storeId = stripeId;
    const res = await fetch('/api/products/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, fileName, storeId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload image');
    }
    const data = await res.json();
    return data.publicUrl as string;
  }

  async function handleSave() {
    setSaveStatus('saving');
    setSaveError('');
    try {
      const priceValue = parseFloat(form.price);
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        active: form.active,
      };

      // If a new image was selected, upload to Supabase Storage and send the URL
      if (form.imageBase64 && form.imageFileName) {
        const publicUrl = await uploadImageToSupabase(form.imageBase64, form.imageFileName);
        payload.images = [publicUrl];
      }

      // Only update price if it changed
      const originalPrice = product.stripePrice ?? (typeof product.price === 'string' ? parseFloat(product.price) : product.price);
      if (!isNaN(priceValue) && priceValue !== originalPrice) {
        payload.price = priceValue;
        payload.currency = form.currency;
        payload.priceId = product.stripePriceId ?? undefined;
        payload.recurring = product.isRecurring ?? false;
        payload.interval = product.interval ?? 'month';
      }

      const result = await updateProduct.mutateAsync({ id: stripeId, data: payload });
      setSaveStatus('success');
      if (onUpdated) {
        const updatedProduct: LiveProduct = {
          ...product,
          name: form.name.trim(),
          description: form.description.trim(),
          status: form.active ? 'active' : 'archived',
          stripeActive: form.active,
          stripePrice: !isNaN(priceValue) ? priceValue : product.stripePrice,
          price: !isNaN(priceValue) ? priceValue : product.price,
          stripePriceId: result.price?.id ?? product.stripePriceId,
          images: form.imageBase64
            ? [{ url: (payload.images as string[])?.[0] ?? product.images[0]?.url ?? '', altText: product.name }]
            : product.images,
        };
        onUpdated(updatedProduct);
      }
      setShowEditModal(false);
      setSaveStatus('idle');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleArchive() {
    setDeleteStatus('deleting');
    setDeleteError('');
    try {
      await deleteProduct.mutateAsync({ id: stripeId, permanent: false });
      setDeleteStatus('success');
      setTimeout(() => {
        setShowDeleteModal(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setDeleteStatus('error');
      setDeleteError(err instanceof Error ? err.message : 'Failed to archive product');
    }
  }

  async function handlePermanentDelete() {
    setDeleteStatus('deleting');
    setDeleteError('');
    try {
      await deleteProduct.mutateAsync({ id: stripeId, permanent: true });
      setDeleteStatus('success');
      setTimeout(() => {
        setShowDeleteModal(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setDeleteStatus('error');
      setDeleteError(err instanceof Error ? err.message : 'Failed to permanently delete product');
    }
  }

  async function handleInventorySave() {
    setInventorySaveStatus('saving');
    setInventorySaveError('');
    try {
      let newQty: number;
      if (inventoryEditMode === 'set') {
        newQty = parseInt(inventoryInput, 10);
        if (isNaN(newQty) || newQty < 0) throw new Error('Please enter a valid quantity (0 or more)');
      } else {
        const delta = parseInt(adjustDelta, 10);
        if (isNaN(delta)) throw new Error('Please enter a valid adjustment amount');
        newQty = Math.max(0, inventoryQty + delta);
      }

      const currentMetadata = product.metadata ?? {};
      await updateProduct.mutateAsync({
        id: stripeId,
        data: {
          metadata: {
            ...currentMetadata,
            inventory: String(newQty),
          },
        },
      });

      setInventoryQty(newQty);
      setInventoryInput(String(newQty));
      setAdjustDelta('');
      setInventorySaveStatus('success');
      if (onUpdated) {
        onUpdated({
          ...product,
          inventoryQuantity: newQty,
          metadata: { ...currentMetadata, inventory: String(newQty) },
        });
      }
      setTimeout(() => setInventorySaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setInventorySaveStatus('error');
      setInventorySaveError(err instanceof Error ? err.message : 'Failed to update inventory');
    }
  }

  const displayPrice = product.stripePrice ?? (typeof product.price === 'string' ? parseFloat(product.price) : product.price) ?? 0;
  const currency = (product.stripeCurrency ?? 'usd').toUpperCase();

  const previewNewQty = inventoryEditMode === 'adjust' && adjustDelta !== ''
    ? Math.max(0, inventoryQty + (parseInt(adjustDelta, 10) || 0))
    : null;

  const currentImageUrl = product.images[0]?.url;

  return (
    <>
      {/* ── Detail Panel ── */}
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/20" onClick={onClose} />
        <div className="w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto slide-in-right scrollbar-thin">
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
            <div className="flex-1 min-w-0">
              <h2 className="font-600 text-foreground truncate">{product.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground font-mono">{stripeId}</p>
                <a
                  href={stripeDashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-0.5 hover:underline"
                  title="View in Stripe Dashboard"
                >
                  <ExternalLink size={10} />
                  Stripe
                </a>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground ml-3">
              <X size={16} />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-6">
            {/* Stripe sync badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-500">Synced with Stripe</span>
              <span className="text-xs text-muted-foreground ml-auto">Changes save directly to Stripe</span>
            </div>

            {/* Image */}
            {product.images[0] && (
              <div className="w-full h-48 rounded-xl bg-muted overflow-hidden">
                <img src={product.images[0].url} alt={`${product.name} product image`} className="w-full h-full object-contain" />
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-500 ${product.stripeActive ?? product.status === 'active' ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
                {product.stripeActive ?? product.status === 'active' ? 'Active' : 'Inactive'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-500 bg-info-bg text-info">
                {product.isRecurring ? 'Subscription' : 'One-time'}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-secondary-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Pricing */}
            <div className="bg-muted/40 rounded-xl p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p className="text-xl font-600 text-foreground">
                  {displayPrice > 0 ? `${currency} ${displayPrice.toFixed(2)}` : 'Free / Custom'}
                </p>
                {product.isRecurring && (
                  <p className="text-xs text-muted-foreground mt-0.5">per {product.interval ?? 'month'}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Price ID</p>
                <p className="text-xs font-mono text-muted-foreground break-all">{product.stripePriceId ?? '—'}</p>
              </div>
            </div>

            {/* ── Inventory Adjustment ── */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                <Package size={14} className="text-muted-foreground" />
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Inventory</span>
                <span className={`ml-auto text-sm font-600 tabular-nums ${inventoryQty === 0 ? 'text-destructive' : inventoryQty < 10 ? 'text-warning' : 'text-success'}`}>
                  {inventoryQty} in stock
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {/* Mode tabs */}
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-500">
                  <button
                    onClick={() => setInventoryEditMode('set')}
                    className={`flex-1 py-1.5 transition-colors ${inventoryEditMode === 'set' ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  >
                    Set Quantity
                  </button>
                  <button
                    onClick={() => setInventoryEditMode('adjust')}
                    className={`flex-1 py-1.5 transition-colors ${inventoryEditMode === 'adjust' ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  >
                    Adjust (+/-)
                  </button>
                </div>

                {inventoryEditMode === 'set' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const v = Math.max(0, parseInt(inventoryInput, 10) - 1 || 0);
                        setInventoryInput(String(v));
                      }}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                      value={inventoryInput}
                      onChange={(e) => setInventoryInput(e.target.value)}
                      placeholder="0"
                    />
                    <button
                      onClick={() => {
                        const v = (parseInt(inventoryInput, 10) || 0) + 1;
                        setInventoryInput(String(v));
                      }}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAdjustDelta((v) => String((parseInt(v, 10) || 0) - 1))}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                        value={adjustDelta}
                        onChange={(e) => setAdjustDelta(e.target.value)}
                        placeholder="+10 or -5"
                      />
                      <button
                        onClick={() => setAdjustDelta((v) => String((parseInt(v, 10) || 0) + 1))}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {previewNewQty !== null && (
                      <p className="text-xs text-muted-foreground text-center">
                        {inventoryQty} → <span className="font-600 text-foreground">{previewNewQty}</span> units
                      </p>
                    )}
                  </div>
                )}

                {/* Inventory save feedback */}
                {inventorySaveStatus === 'success' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-success-bg border border-success/20 rounded-lg text-success text-xs">
                    <CheckCircle size={12} />
                    Inventory updated successfully
                  </div>
                )}
                {inventorySaveStatus === 'error' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs">
                    <AlertCircle size={12} />
                    {inventorySaveError}
                  </div>
                )}

                <button
                  onClick={handleInventorySave}
                  disabled={inventorySaveStatus === 'saving'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {inventorySaveStatus === 'saving' ? (
                    <><RefreshCw size={13} className="animate-spin" />Saving…</>
                  ) : (
                    <><Save size={13} />Update Inventory</>
                  )}
                </button>
              </div>
            </div>

            {/* All Prices */}
            {product.stripePrices && product.stripePrices.length > 0 && (
              <div>
                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">All Prices</p>
                <div className="flex flex-col gap-1.5">
                  {product.stripePrices.map((p: StripePrice) => (
                    <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${p.active ? 'border-border bg-muted/20' : 'border-border/50 bg-muted/10 opacity-60'}`}>
                      <div>
                        <span className="font-mono text-muted-foreground">{p.id}</span>
                        {p.nickname && <span className="ml-2 text-foreground">{p.nickname}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-500 text-foreground">
                          {p.unitAmount != null ? `${p.currency.toUpperCase()} ${(p.unitAmount / 100).toFixed(2)}` : 'Custom'}
                        </span>
                        {p.recurring && <span className="text-muted-foreground">/{p.recurring.interval}</span>}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-500 ${p.active ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
                          {p.active ? 'active' : 'archived'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {product.metadata && Object.keys(product.metadata).length > 0 && (
              <div>
                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Metadata</p>
                <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs text-muted-foreground">
                  {Object.entries(product.metadata).map(([k, v]) => (
                    <div key={k}><span className="text-primary">{k}</span>: {v}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Conversion Features</p>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-500 ${product.hasUpsell ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>
                  <Zap size={14} />
                  1-Click Upsell
                  <span className={`text-xs ${product.hasUpsell ? 'text-primary' : 'text-muted-foreground'}`}>{product.hasUpsell ? 'Active' : 'Off'}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-500 ${product.hasOrderBump ? 'border-success/30 bg-success-bg text-success' : 'border-border text-muted-foreground'}`}>
                  <ShoppingBag size={14} />
                  Order Bump
                  <span className={`text-xs ${product.hasOrderBump ? 'text-success' : 'text-muted-foreground'}`}>{product.hasOrderBump ? 'Active' : 'Off'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={openEditModal}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Edit2 size={14} />
                Edit Product
              </button>
              <a
                href={stripeDashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground inline-flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                Stripe
              </a>
            </div>

            {/* Delete Button */}
            <div className="border-t border-border pt-4">
              <button
                onClick={openDeleteModal}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive text-sm font-500 rounded-lg border border-destructive/30 hover:bg-destructive/20 transition-colors"
              >
                <Trash2 size={14} />
                Delete Product
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Product Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (saveStatus !== 'saving') setShowEditModal(false); }} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-xl shadow-xl my-8">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-600 text-foreground">Edit Product</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Changes save directly to Stripe</p>
              </div>
              <button
                onClick={() => { if (saveStatus !== 'saving') setShowEditModal(false); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
              {/* Success Message */}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-success-bg border border-success/20 rounded-lg text-success text-sm">
                  <CheckCircle size={14} />
                  Product updated successfully!
                </div>
              )}

              {/* Error Message */}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle size={14} />
                  {saveError || 'Failed to update product'}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">Product Name *</label>
                <input
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Product name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">Description</label>
                <textarea
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Product description"
                />
              </div>

              {/* ── Image Upload (rewritten) ── */}
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">Product Image</label>

                {currentImageUrl && !editImagePreviewUrl && !showImageFileInput ? (
                  /* ── Has current image, no new preview, not showing file input ── */
                  <div className="relative w-full h-48 rounded-xl bg-muted overflow-hidden group">
                    <img src={currentImageUrl} alt="Current product image" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setShowImageFileInput(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90"
                      >
                        <Camera size={14} />
                        Change Image
                      </button>
                    </div>
                  </div>
                ) : editImagePreviewUrl ? (
                  /* ── New image preview with Remove button ── */
                  <div className="relative w-full h-48 rounded-xl bg-muted overflow-hidden">
                    <img src={editImagePreviewUrl} alt="New image preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleRemoveNewImage}
                        className="opacity-0 hover:opacity-100 transition-opacity inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground text-sm font-500 rounded-lg"
                      >
                        <XCircle size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── No current image, or showing file input ── */
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg border border-border bg-muted overflow-hidden flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Upload size={20} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="w-full text-sm text-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-500 file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WEBP under 2MB</p>
                      {form.imageFileName && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-muted-foreground">{form.imageFileName}</span>
                          <button
                            onClick={handleRemoveNewImage}
                            className="text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">Price</label>
                <div className="flex items-center gap-2">
                  <select
                    className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  >
                    <option value="usd">USD</option>
                    <option value="eur">EUR</option>
                    <option value="gbp">GBP</option>
                    <option value="cad">CAD</option>
                    <option value="aud">AUD</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                {/* Price change warning */}
                <div className="mt-2 px-3 py-2 bg-warning-bg border border-warning/30 rounded-lg text-xs text-warning">
                  <p className="font-500">⚠️ Changing the price will:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Archive the current price in Stripe (prices are immutable)</li>
                    <li>Create a new price in Stripe</li>
                    <li>Existing subscribers will keep their current price</li>
                  </ul>
                </div>
              </div>

              {/* Active/Inactive toggle */}
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.active ? 'bg-success' : 'bg-muted-foreground/30'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-500 text-foreground">{form.active ? 'Active' : 'Archived'}</span>
                </label>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving' || !form.name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saveStatus === 'saving' ? (
                  <><RefreshCw size={14} className="animate-spin" />Saving to Stripe…</>
                ) : saveStatus === 'success' ? (
                  <><CheckCircle size={14} />Saved!</>
                ) : (
                  <><Save size={14} />Save to Stripe</>
                )}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (deleteStatus !== 'deleting') setShowDeleteModal(false); }} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-600 text-foreground text-base">Delete Product</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Success */}
              {deleteStatus === 'success' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-success-bg border border-success/20 rounded-lg text-success text-sm">
                  <CheckCircle size={14} />
                  Product deleted successfully
                </div>
              )}

              {/* Error */}
              {deleteStatus === 'error' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle size={14} />
                  {deleteError || 'Failed to process product'}
                </div>
              )}

              {deleteStatus !== 'success' && (
                <>
                  <div className="flex items-start gap-3 px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm">
                    <AlertCircle size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-500 text-foreground">What would you like to do with <strong>{product.name}</strong>?</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Archiving hides it from checkout but preserves data in Stripe. Deleting permanently removes it (only available when no active prices exist).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleArchive}
                      disabled={deleteStatus === 'deleting'}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground text-sm font-500 rounded-lg border border-border hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      {deleteStatus === 'deleting' ? (
                        <><RefreshCw size={14} className="animate-spin" />Processing…</>
                      ) : (
                        <><Trash2 size={14} />Archive (deactivate)</>
                      )}
                    </button>
                    <button
                      onClick={handlePermanentDelete}
                      disabled={deleteStatus === 'deleting' || (product.stripePrices?.some(p => p.active) ?? false)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      title={product.stripePrices?.some(p => p.active) ? 'Cannot delete: product has active prices. Archive them first.' : 'Permanently delete from Stripe'}
                    >
                      {deleteStatus === 'deleting' ? (
                        <><RefreshCw size={14} className="animate-spin" />Processing…</>
                      ) : (
                        <><Trash2 size={14} />Delete Permanently</>
                      )}
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      disabled={deleteStatus === 'deleting'}
                      className="w-full px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}