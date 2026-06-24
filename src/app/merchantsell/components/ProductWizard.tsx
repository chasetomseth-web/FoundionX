'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, X, Save,
  Plus, Trash2, Copy, CheckCircle, Star, Upload, Loader2,
  Check, Link2, FileText, Globe, CreditCard, Package,
  ShoppingCart, Layers, GitFork, Truck, Users, Share2,
  Award, Image, DollarSign, Zap, Shield, Clock,
  Eye, Edit, GripVertical, Settings, ToggleLeft,
  Download, Link, Calendar, Hash, Sigma, Bell,
  MessageSquare, ThumbsUp, BarChart, Rocket,
  BookOpen, Grid, Tag, Heart, Search, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductData {
  id: string;
  name: string;
  slug: string;
  type: string;
  description?: string | null;
  price: number;
  status: string;
  hasOrderBump?: boolean;
  hasUpsell?: boolean;
  metadata?: Record<string, unknown>;
  images?: Array<{ url: string }>;
  costPrice?: number | null;
  compareAtPrice?: number | null;
  sku?: string | null;
  weight?: number | null;
}

interface StepProps {
  productId: string;
  funnelId: string;
  productData: ProductData;
  onUpdate: (patch: Record<string, unknown>) => void;
  onNext: () => void;
  onPrev: () => void;
  onRegisterSaveHandler: (handler: () => Promise<void>) => void;
}

interface WizardStep {
  num: number;
  label: string;
  icon: React.ElementType;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const cardCls = 'bg-white rounded-xl border border-gray-200 p-5';
const sectionTitleCls = 'text-base font-600 text-gray-900 mb-3';

async function patchProduct(productId: string, data: Record<string, unknown>) {
  // If productId is 'new' or undefined, use POST instead of PATCH
  if (productId === 'new' || !productId) {
    const res = await fetch(`/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Create failed (${res.status})`);
    }
    const json = await res.json();
    return json.product ?? json;
  }

  const res = await fetch(`/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Save failed (${res.status})`);
  }
  const json = await res.json();
  return json;
}

async function createProduct(data: Record<string, unknown>) {
  console.log('createProduct payload:', JSON.stringify(data))
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Create failed (${res.status})`);
  }
  const json = await res.json();
  return json.product ?? json;
}

function PinkToggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${value ? 'bg-[#e8556d]' : 'bg-gray-200'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className={`${labelCls}`}>
      {children} <span className="text-red-500">*</span>
    </label>
  );
}

const InputWithError = React.forwardRef<HTMLInputElement, { label: string; required?: boolean; error?: string | null } & React.InputHTMLAttributes<HTMLInputElement>>(function InputWithError({ label, required, error, ...props }, ref) {
  return (
    <div>
      {required ? <RequiredLabel>{label}</RequiredLabel> : <label className={labelCls}>{label}</label>}
      <input ref={ref} className={`${inputCls} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : ''}`} {...props} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
});

// ── Step 1 — Info ─────────────────────────────────────────────────────────────

function Step1Info({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const [internalName, setInternalName] = useState((productData.metadata?.internalName as string) ?? '');
  const [externalName, setExternalName] = useState(productData.name ?? '');
  const [description, setDescription] = useState(productData.description ?? '');
  const [statementDescriptor, setStatementDescriptor] = useState((productData.metadata?.statementDescriptor as string) ?? '');
  const [imageUrl, setImageUrl] = useState(productData.images?.[0]?.url ?? '');
  const [productType, setProductType] = useState(productData.type ?? 'physical');
  const [saving, setSaving] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const internalNameRef = useRef<HTMLInputElement>(null);
  const externalNameRef = useRef<HTMLInputElement>(null);

  const productTypes = [
    { value: 'physical', label: 'Physical', desc: 'Tangible product that ships to customers', icon: Package },
    { value: 'digital', label: 'Digital', desc: 'Downloadable file or digital content', icon: Download },
    { value: 'subscription', label: 'Subscription', desc: 'Recurring billing product', icon: Clock },
    { value: 'service', label: 'Service', desc: 'Bookable service or appointment', icon: Shield },
  ];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!internalName.trim()) errs.internalName = 'Internal name is required';
    if (!externalName.trim()) errs.externalName = 'External name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const uploadImageFile = (file: File) => {
    return new Promise<{ publicUrl: string; path: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      if (productId) formData.append('productId', productId);

      xhr.open('POST', '/api/products/upload-image');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result?.publicUrl) {
              resolve(result);
              return;
            }
            reject(new Error(result?.error || 'Upload failed'));
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadImageFile(file);
      setImageUrl(result.publicUrl);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const submittingRef = useRef(false);
  const handleContinue = useCallback(async () => {
    const resolvedInternalName = internalName || internalNameRef.current?.value || '';
    const resolvedExternalName = externalName || externalNameRef.current?.value || '';
    console.log('handleContinue: productId =', productId, 'resolvedExternalName =', resolvedExternalName);
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      if (!validate()) { submittingRef.current = false; return; }
      setSaving(true);
      const slug = resolvedExternalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
      const metadata = { ...(productData.metadata ?? {}), internalName: resolvedInternalName, statementDescriptor, productType };

      if (!productId || productId === 'new' || !productData?.id) {
        console.log('Creating product with:', { name: resolvedExternalName, internalName: resolvedInternalName });
        const created = await createProduct({
          name: resolvedExternalName,
          internalName: resolvedInternalName,
          description,
          type: productType,
          metadata,
          slug,
          imageUrl: imageUrl || null,
        });
        onUpdate({ id: created.id, name: resolvedExternalName, slug: created.slug ?? slug, description, type: productType, metadata });
        // Also register the updated handler after creation so subsequent saves use the real productId
        onRegisterSaveHandler(handleContinue);
      } else {
        await patchProduct(productId, {
          name: resolvedExternalName,
          description,
          type: productType,
          metadata,
          imageUrl: imageUrl || null,
        });
        onUpdate({ name: resolvedExternalName, description, type: productType, metadata });
      }
      toast.success('Product info saved');
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }, [internalName, externalName, description, statementDescriptor, imageUrl, productType, productId, onUpdate, onNext]);

  // Register save handler synchronously on every render, NOT just in useEffect.
  // This ensures saveHandlerRef.current is always set before any user interaction.
  onRegisterSaveHandler(handleContinue);
  useEffect(() => {
    // No-op: registration happens synchronously above
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-4">
        <InputWithError label="Internal Product Name" required value={internalName} onChange={e => setInternalName(e.target.value)} placeholder="For admin use only" error={errors.internalName} ref={internalNameRef} />
        <InputWithError label="External Product Name" required value={externalName} onChange={e => setExternalName(e.target.value)} placeholder="Shown to customers" error={errors.externalName} ref={externalNameRef} />
        <div>
          <label className={labelCls}>Product Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this product..." rows={4} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Statement Descriptor</label>
          <div className="relative">
            <input value={statementDescriptor} onChange={e => { console.log('Statement Descriptor onChange:', e.target.value); setStatementDescriptor(e.target.value); }} placeholder="Appears on customer's bank statement" className={inputCls} maxLength={22} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{statementDescriptor.length}/22</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">This text appears on your customer's bank statement.</p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-28 h-28 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group relative flex-shrink-0">
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
              <button onClick={() => setImageUrl('')} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            </>
          ) : (
            <div className="text-center p-2">
              <Upload size={20} className="mx-auto text-gray-300 mb-1" />
              <p className="text-[10px] text-gray-400">Image</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            {uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
          </button>
          <button type="button" className="px-3 py-1.5 text-xs font-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setShowUrlInput(!showUrlInput)}>
            URL
          </button>
          {showUrlInput && (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={pendingImageUrl}
                onChange={e => setPendingImageUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && pendingImageUrl.trim()) {
                    setImageUrl(pendingImageUrl.trim());
                    setShowUrlInput(false);
                    setPendingImageUrl('');
                  } else if (e.key === 'Escape') {
                    setShowUrlInput(false);
                    setPendingImageUrl('');
                  }
                }}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 outline-none focus:border-[#e8556d]"
              />
              <button
                type="button"
                onClick={() => { if (pendingImageUrl.trim()) { setImageUrl(pendingImageUrl.trim()); setShowUrlInput(false); setPendingImageUrl(''); } }}
                className="px-2 py-1.5 text-xs font-500 bg-[#e8556d] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Set
              </button>
            </div>
          )}
          {uploading && <p className="text-xs text-gray-500">Progress: {uploadProgress}%</p>}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { handleImageUpload(file); } }} />
        </div>
      </div>

      <div>
        <h3 className={sectionTitleCls}>Product Type</h3>
        <div className="grid grid-cols-2 gap-3">
          {productTypes.map(pt => {
            const Icon = pt.icon;
            const selected = productType === pt.value;
            return (
              <button key={pt.value} onClick={() => setProductType(pt.value)}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${selected ? 'border-[#e8556d] bg-[#e8556d]/5' : 'border-gray-200 hover:border-[#e8556d]/50'}`}>
                <Icon size={20} className="mb-2 text-[#e8556d]" />
                <p className="font-600 text-sm text-gray-900">{pt.label}</p>
                <p className="text-xs text-gray-500 mt-1">{pt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Pricing ──────────────────────────────────────────────────────────

type PricingModel = 'one_time' | 'subscription' | 'payment_plan' | 'free';

interface PriceVariant {
  id: string;
  label: string;
  price: string;
  compareAt: string;
  costPrice: string;
  isDefault: boolean;
}

function Step2Pricing({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const [pricingModel, setPricingModel] = useState<PricingModel>((meta.pricingModel as PricingModel) ?? 'one_time');
  const [currency, setCurrency] = useState('USD');
  const [price, setPrice] = useState(productData.price ? String(productData.price / 100) : '');
  const [compareAt, setCompareAt] = useState(productData.compareAtPrice ? String(productData.compareAtPrice / 100) : '');
  const [costPrice, setCostPrice] = useState(productData.costPrice ? String(productData.costPrice / 100) : '');
  const [trialDays, setTrialDays] = useState((meta.trialDays as string) ?? '');
  const [hasTrial, setHasTrial] = useState(!!meta.trialDays);
  const [setupFee, setSetupFee] = useState((meta.setupFee as string) ?? '');
  const [hasSetupFee, setHasSetupFee] = useState(!!meta.setupFee);
  const [variants, setVariants] = useState<PriceVariant[]>((meta.priceVariants as PriceVariant[]) ?? []);
  const [saving, setSaving] = useState(false);

  const priceNum = parseFloat(price) || 0;
  const costNum = parseFloat(costPrice) || 0;
  const margin = priceNum > 0 ? Math.round(((priceNum - costNum) / priceNum) * 100) : 0;

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      const metadata = {
        ...meta,
        pricingModel,
        trialDays: hasTrial ? trialDays : null,
        setupFee: hasSetupFee ? setupFee : null,
        priceVariants: variants,
      };
      await patchProduct(productId, {
        price: Math.round(priceNum * 100),
        compareAtPrice: parseFloat(compareAt) ? Math.round(parseFloat(compareAt) * 100) : null,
        costPrice: costNum ? Math.round(costNum * 100) : null,
        metadata,
      });
      onUpdate({ price: priceNum, metadata });
      toast.success('Pricing saved');
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [pricingModel, price, compareAt, costPrice, trialDays, hasTrial, setupFee, hasSetupFee, variants, productId, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  const pricingModels: Array<{ value: PricingModel; label: string; icon: React.ElementType }> = [
    { value: 'one_time', label: 'One-time', icon: DollarSign },
    { value: 'subscription', label: 'Subscription', icon: Clock },
    { value: 'payment_plan', label: 'Payment Plan', icon: Grid },
    { value: 'free', label: 'Free', icon: Award },
  ];

  const addVariant = () => {
    setVariants(prev => [...prev, { id: `v_${Date.now()}`, label: `Variant ${prev.length + 1}`, price: '', compareAt: '', costPrice: '', isDefault: prev.length === 0 }]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Pricing model tabs */}
      <div className="grid grid-cols-4 gap-2">
        {pricingModels.map(pm => (
          <button key={pm.value} onClick={() => setPricingModel(pm.value)}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-500 transition-all ${pricingModel === pm.value ? 'border-[#e8556d] bg-[#e8556d]/5 text-[#e8556d]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
          >
            <pm.icon size={16} /> {pm.label}
          </button>
        ))}
      </div>

      {pricingModel !== 'free' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Price</label>
              <div className="flex">
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-20 px-2 py-2 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm outline-none">
                  <option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option>
                </select>
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={`${inputCls} rounded-l-none`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Compare-at Price</label>
              <input type="number" step="0.01" value={compareAt} onChange={e => setCompareAt(e.target.value)} placeholder="0.00" className={inputCls} />
              {compareAt && <p className="text-xs text-green-600 mt-1">Shows strikethrough on frontend</p>}
            </div>
            <div>
              <label className={labelCls}>Cost Price</label>
              <input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" className={inputCls} />
              {costNum > 0 && (
                <p className={`text-xs mt-1 ${margin >= 50 ? 'text-green-600' : margin >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                  Margin: {margin}%
                </p>
              )}
            </div>
          </div>

          {pricingModel === 'subscription' && (
            <div className={`${cardCls} space-y-3`}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-500 text-gray-700">Free Trial Period</label>
                <PinkToggle value={hasTrial} onChange={setHasTrial} />
              </div>
              {hasTrial && (
                <div className="flex items-center gap-3 ml-2">
                  <input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} placeholder="0" className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d]" />
                  <span className="text-sm text-gray-500">days free</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="text-sm font-500 text-gray-700">Setup Fee</label>
                <PinkToggle value={hasSetupFee} onChange={setHasSetupFee} />
              </div>
              {hasSetupFee && (
                <div className="flex items-center gap-3 ml-2">
                  <span className="text-sm text-gray-500">$</span>
                  <input type="number" step="0.01" value={setupFee} onChange={e => setSetupFee(e.target.value)} placeholder="0.00" className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d]" />
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={sectionTitleCls}>Additional Price Points</h3>
              <button onClick={addVariant} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8556d] text-white text-xs font-500 rounded-lg hover:opacity-90 transition-opacity">
                <Plus size={12} /> Add Price
              </button>
            </div>
            {variants.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No additional price points. Click "Add Price" to create variants.</p>
            ) : (
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                    <input value={v.label} onChange={e => { const u = [...variants]; u[i] = { ...u[i], label: e.target.value }; setVariants(u); }} placeholder="Label" className="w-28 px-2 py-1.5 text-xs rounded-lg border border-gray-200 outline-none focus:border-[#e8556d]" />
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 mr-1">$</span>
                      <input type="number" step="0.01" value={v.price} onChange={e => { const u = [...variants]; u[i] = { ...u[i], price: e.target.value }; setVariants(u); }} placeholder="0.00" className="w-20 px-2 py-1.5 text-xs rounded-lg border border-gray-200 outline-none focus:border-[#e8556d]" />
                    </div>
                    <button onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto p-1 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {pricingModel === 'free' && (
        <div className="py-8 text-center">
          <Award size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Free product — no payment required from customers.</p>
        </div>
      )}
    </div>
  );
}

// ── Step 3 — Gateways —────────────────────────────────────────────────────────

// ── Step 3 — Gateways ─────────────────────────────────────────────────────────

function Step3Gateways({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const savedGateways = (meta.gateways as Record<string, any>) ?? {};
  const [gateways, setGateways] = useState<Record<string, { enabled: boolean; connected: boolean; label: string }>>({
    stripe: { enabled: savedGateways.stripe?.enabled ?? true, connected: false, label: 'Stripe' },
    paypal: { enabled: savedGateways.paypal?.enabled ?? false, connected: false, label: 'PayPal' },
    apple_pay: { enabled: savedGateways.apple_pay?.enabled ?? false, connected: false, label: 'Apple Pay' },
    google_pay: { enabled: savedGateways.google_pay?.enabled ?? false, connected: false, label: 'Google Pay' },
    bank_transfer: { enabled: savedGateways.bank_transfer?.enabled ?? false, connected: false, label: 'Bank Transfer' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkGatewayStatus = async () => {
      try {
        const settingsRes = await fetch('/api/integrations/settings').catch(() => null);
        const settingsData = settingsRes ? await settingsRes.json().catch(() => ({})) : {};
        const s = settingsData?.settings ?? {};
        const isConnected = (key: string) => !!(s[key]?.connected || s[key]?.envConnected);
        setGateways(prev => ({
          ...prev,
          stripe: { ...prev.stripe, connected: isConnected('stripe') },
          paypal: { ...prev.paypal, connected: isConnected('paypal') },
          apple_pay: { ...prev.apple_pay, connected: isConnected('apple_pay') },
          google_pay: { ...prev.google_pay, connected: isConnected('google_pay') },
          bank_transfer: { ...prev.bank_transfer, connected: isConnected('bank_transfer') },
        }));
      } catch (e) {
        console.error('Failed to check gateway status:', e);
      } finally {
        setLoading(false);
      }
    };

    checkGatewayStatus();
  }, []);

  const toggleGateway = async (key: string) => {
    const newEnabled = !gateways[key].enabled;
    setGateways(prev => ({ ...prev, [key]: { ...prev[key], enabled: newEnabled } }));
    await fetch('/api/integrations/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: key, connected: newEnabled }),
    }).catch(() => {});
    toast.success(newEnabled ? 'Gateway enabled' : 'Gateway disabled');
  };

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      const metadata = { ...(productData.metadata ?? {}), gateways };
      await patchProduct(productId, { metadata });
      onUpdate({ metadata });
      toast.success('Gateways saved');
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }, [gateways, productId, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  const gatewayIcons: Record<string, React.ElementType> = { stripe: CreditCard, paypal: Globe, apple_pay: Zap, google_pay: Shield, bank_transfer: Building2 };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <p className="text-sm text-gray-500">Enable payment gateways for this product.</p>
      {!gateways.stripe.connected ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm">
            Stripe is not connected. <a href="/settings" className="font-600 underline hover:no-underline">Connect it in Settings</a> to accept payments.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-500">
          <CheckCircle size={16} className="text-green-500" />
          Stripe connected
        </div>
      )}
      <div className="space-y-3">
        {Object.entries(gateways).map(([key, gw]) => {
          const Icon = gatewayIcons[key] || CreditCard;
          const isStripe = key === 'stripe';
          return (
            <div key={key} className={`${cardCls} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gw.connected ? 'bg-green-500/10' : 'bg-gray-100'}`}>
                  <Icon size={18} className={gw.connected ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="text-sm font-500 text-gray-900">{gw.label}</p>
                  <span className={`text-xs ${gw.connected ? 'text-green-600' : 'text-red-400'}`}>
                    {gw.connected ? '✓ Connected' : '✗ Not connected'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!gw.connected && <a href="/settings" className="text-xs text-[#e8556d] hover:underline font-500">Connect in Settings</a>}
                <PinkToggle value={gw.enabled} onChange={() => toggleGateway(key)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Building2(props: any) { return <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>}

// ── Step 4 — Contents ─────────────────────────────────────────────────────────

type ProductFileRef = { id: string; name: string; url: string };

function Step4Contents({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const contentMeta = (meta.contents as Record<string, any>) ?? {};
  const [files, setFiles] = useState<ProductFileRef[]>(
    (contentMeta.files as ProductFileRef[]) ?? (meta.contentFiles as ProductFileRef[]) ?? []
  );
  const [externalUrl, setExternalUrl] = useState((contentMeta.externalUrl as string) ?? (meta.contentExternalUrl as string) ?? '');
  const [deliveryTrigger, setDeliveryTrigger] = useState((contentMeta.deliveryTrigger as string) ?? (meta.deliveryTrigger as string) ?? 'immediately');
  const [downloadLimit, setDownloadLimit] = useState((contentMeta.downloadLimit as string) ?? (meta.downloadLimit as string) ?? 'unlimited');
  const [downloadLimitNum, setDownloadLimitNum] = useState((contentMeta.downloadLimitNum as string) ?? (meta.downloadLimitNum as string) ?? '');
  const [expiry, setExpiry] = useState((contentMeta.expiry as string) ?? (meta.contentExpiry as string) ?? 'never');
  const [expiryDays, setExpiryDays] = useState((contentMeta.expiryDays as string) ?? (meta.contentExpiryDays as string) ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      const metadata = {
        ...meta,
        contents: {
          ...(contentMeta ?? {}),
          files,
          externalUrl,
          deliveryTrigger,
          downloadLimit,
          downloadLimitNum,
          expiry,
          expiryDays,
        },
      };
      await patchProduct(productId, { metadata });
      onUpdate({ metadata });
      toast.success('Content settings saved');
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }, [files, externalUrl, deliveryTrigger, downloadLimit, downloadLimitNum, expiry, expiryDays, productId, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  const uploadFile = (file: File) => {
    return new Promise<{ publicUrl: string; path: string; id?: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', productId);
      xhr.open('POST', '/api/products/upload-file');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result?.publicUrl) {
              resolve(result);
              return;
            }
            reject(new Error(result?.error || 'Upload failed'));
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadFile(file);
      setFiles(prev => [
        ...prev,
        {
          id: result.id ?? `f_${Date.now()}`,
          name: file.name,
          url: result.publicUrl,
        },
      ]);
      toast.success('File uploaded');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [pendingLink, setPendingLink] = useState<{ name: string; url: string }>({ name: '', url: '' });

  const commitLink = () => {
    if (!pendingLink.name.trim() || !pendingLink.url.trim()) {
      toast.error('Link name and URL are required');
      return;
    }
    setFiles(prev => [...prev, { id: `f_${Date.now()}`, name: pendingLink.name.trim(), url: pendingLink.url.trim() }]);
    setPendingLink({ name: '', url: '' });
    setShowLinkForm(false);
    toast.success('External link added');
  };

  // Hydrate files from DB on mount
  useEffect(() => {
    if (!productId || productId === 'new') return;
    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(data => {
        const dbFiles = data.product?.files ?? data.files ?? [];
        if (!Array.isArray(dbFiles) || dbFiles.length === 0) return;
        setFiles(prev => {
          const existingIds = new Set(prev.map(f => f.id));
          const newEntries = dbFiles
            .filter((f: any) => f.id && !existingIds.has(f.id))
            .map((f: any) => ({ id: f.id, name: f.name ?? '', url: f.url ?? '' }));
          if (newEntries.length === 0) return prev;
          return [...prev, ...newEntries];
        });
      })
      .catch(() => {});
  }, [productId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className={`${cardCls}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={sectionTitleCls}>Product Files</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8556d] text-white text-xs font-500 rounded-lg hover:opacity-90 transition-opacity">
              <Upload size={12} /> Upload File
            </button>
            <button type="button" onClick={() => setShowLinkForm(!showLinkForm)} className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 text-xs text-gray-500 rounded-lg hover:border-[#e8556d] hover:text-[#e8556d] transition-colors">
              <Plus size={12} /> Add Link
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { handleUpload(file); } }} />
        {uploading && <p className="text-xs text-gray-500 mb-3">Uploading {uploadProgress}%…</p>}
        <div className="space-y-3">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <FileText size={16} className="text-gray-400 flex-shrink-0" />
              <input value={f.name} onChange={e => setFiles(prev => prev.map(x => x.id === f.id ? { ...x, name: e.target.value } : x))} className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 outline-none min-w-0" />
              <input value={f.url} onChange={e => setFiles(prev => prev.map(x => x.id === f.id ? { ...x, url: e.target.value } : x))} placeholder="File URL" className="w-40 px-2 py-1 text-xs rounded border border-gray-200 outline-none" />
              <button onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))} className="text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 size={12} /></button>
            </div>
          ))}
          {showLinkForm && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-dashed border-gray-300">
              <input
                value={pendingLink.name}
                onChange={e => setPendingLink(prev => ({ ...prev, name: e.target.value }))}
                placeholder="File name"
                className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 outline-none min-w-0 focus:border-[#e8556d]"
              />
              <input
                value={pendingLink.url}
                onChange={e => setPendingLink(prev => ({ ...prev, url: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitLink();
                  else if (e.key === 'Escape') { setShowLinkForm(false); setPendingLink({ name: '', url: '' }); }
                }}
                placeholder="https://example.com/file.pdf"
                className="w-40 px-2 py-1 text-xs rounded border border-gray-200 outline-none focus:border-[#e8556d]"
              />
              <button onClick={commitLink} className="px-2 py-1 text-xs font-500 bg-[#e8556d] text-white rounded-lg hover:opacity-90 transition-opacity">
                Add
              </button>
              <button onClick={() => { setShowLinkForm(false); setPendingLink({ name: '', url: '' }); }} className="text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`${cardCls}`}>
        <h3 className={sectionTitleCls}>External URL</h3>
        <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://example.com/content.zip" className={inputCls} />
        <p className="text-xs text-gray-400 mt-1">Paste a URL to external content (video, ZIP, etc.)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Delivery Trigger</label>
          <select value={deliveryTrigger} onChange={e => setDeliveryTrigger(e.target.value)} className={inputCls}>
            <option value="immediately">Immediately</option>
            <option value="after_payment">After payment confirmed</option>
            <option value="manual">Manual delivery</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Download Limit</label>
          <select value={downloadLimit} onChange={e => setDownloadLimit(e.target.value)} className={inputCls}>
            <option value="unlimited">Unlimited</option>
            <option value="limited">Limited downloads</option>
          </select>
          {downloadLimit === 'limited' && <input type="number" value={downloadLimitNum} onChange={e => setDownloadLimitNum(e.target.value)} placeholder="Count" className={`${inputCls} mt-2`} />}
        </div>
        <div>
          <label className={labelCls}>Expiry</label>
          <select value={expiry} onChange={e => setExpiry(e.target.value)} className={inputCls}>
            <option value="never">Never</option>
            <option value="days">N days after purchase</option>
          </select>
          {expiry === 'days' && <input type="number" value={expiryDays} onChange={e => setExpiryDays(e.target.value)} placeholder="Days" className={`${inputCls} mt-2`} />}
        </div>
      </div>
    </div>
  );
}

// ── Step 5 — Checkout ─────────────────────────────────────────────────────────

function Step5Checkout({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const checkoutMeta = (meta.checkout as Record<string, any>) ?? {};
  const [checkoutTemplate, setCheckoutTemplate] = useState((checkoutMeta.template as string) ?? (meta.checkoutTemplate as string) ?? 'default');
  const [collectEmail, setCollectEmail] = useState(checkoutMeta.fields?.collectEmail ?? true);
  const [collectName, setCollectName] = useState(checkoutMeta.fields?.collectName ?? true);
  const [collectPhone, setCollectPhone] = useState(checkoutMeta.fields?.collectPhone ?? false);
  const [collectAddress, setCollectAddress] = useState(checkoutMeta.fields?.collectAddress ?? true);
  const [collectCompany, setCollectCompany] = useState(checkoutMeta.fields?.collectCompany ?? false);
  const [requiredEmail, setRequiredEmail] = useState(checkoutMeta.fields?.requiredEmail ?? true);
  const [requiredName, setRequiredName] = useState(checkoutMeta.fields?.requiredName ?? true);
  const [requiredPhone, setRequiredPhone] = useState(checkoutMeta.fields?.requiredPhone ?? false);
  const [requiredAddress, setRequiredAddress] = useState(checkoutMeta.fields?.requiredAddress ?? true);
  const [customHeadline, setCustomHeadline] = useState((checkoutMeta.headline as string) ?? (meta.checkoutHeadline as string) ?? '');
  const [showOrderSummary, setShowOrderSummary] = useState(checkoutMeta.showOrderSummary ?? true);
  const [showCoupon, setShowCoupon] = useState(checkoutMeta.showCoupon ?? true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; label: string }>>([
    { id: 'default', label: 'Default Template' },
    { id: 'minimal', label: 'Minimal' },
    { id: 'branded', label: 'Branded' },
    { id: 'two_column', label: 'Two Column' },
  ]);

  useEffect(() => {
    fetch('/api/merchant-pages/checkout-templates')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.pages)) {
          setTemplates(prev => [
            ...prev,
            ...d.pages.map((page: any) => ({ id: `page_${page.id}`, label: `Pagebuilder: ${page.name}` })),
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      const metadata = {
        ...meta,
        checkout: {
          ...(checkoutMeta ?? {}),
          template: checkoutTemplate,
          headline: customHeadline,
          showOrderSummary,
          showCoupon,
          fields: {
            collectEmail,
            collectName,
            collectPhone,
            collectAddress,
            collectCompany,
            requiredEmail,
            requiredName,
            requiredPhone,
            requiredAddress,
          },
        },
      };
      await patchProduct(productId, { metadata });
      onUpdate({ metadata });
      toast.success('Checkout settings saved');
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }, [checkoutTemplate, customHeadline, showOrderSummary, showCoupon, collectEmail, collectName, collectPhone, collectAddress, collectCompany, requiredEmail, requiredName, requiredPhone, requiredAddress, productId, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className={`${cardCls}`}>
        <h3 className={sectionTitleCls}>Checkout Template</h3>
        <div className="grid grid-cols-2 gap-4">
          {templates.map(t => {
            const isSelected = checkoutTemplate === t.id;
            const isPageBuilder = t.id.startsWith('page_');
            return (
              <button key={t.id} onClick={() => setCheckoutTemplate(t.id)}
                className={`relative overflow-hidden rounded-xl border-2 transition-all h-48 flex flex-col items-center justify-center ${
                  isSelected 
                    ? 'border-[#e8556d] bg-[#e8556d]/5 shadow-lg shadow-[#e8556d]/20' 
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}>
                {/* Template preview background */}
                <div className="absolute inset-0 opacity-40 pointer-events-none">
                  {!isPageBuilder ? (
                    <>
                      {t.id === 'default' && (
                        <svg viewBox="0 0 200 180" className="w-full h-full fill-none stroke-gray-300 stroke-1">
                          <rect x="20" y="20" width="160" height="140" rx="4" />
                          <rect x="20" y="20" width="160" height="40" fill="currentColor" className="fill-gray-200" />
                          <line x1="30" y1="70" x2="170" y2="70" />
                          <line x1="30" y1="80" x2="170" y2="80" />
                          <line x1="30" y1="90" x2="120" y2="90" />
                          <rect x="30" y="110" width="140" height="30" rx="2" fill="currentColor" className="fill-gray-300" />
                        </svg>
                      )}
                      {t.id === 'minimal' && (
                        <svg viewBox="0 0 200 180" className="w-full h-full fill-none stroke-gray-300 stroke-1">
                          <line x1="30" y1="40" x2="170" y2="40" strokeWidth="8" stroke="currentColor" className="stroke-gray-200" />
                          <line x1="30" y1="70" x2="170" y2="70" />
                          <line x1="30" y1="85" x2="170" y2="85" />
                          <line x1="30" y1="100" x2="100" y2="100" />
                          <rect x="30" y="125" width="140" height="25" rx="2" fill="currentColor" className="fill-gray-300" />
                        </svg>
                      )}
                      {t.id === 'branded' && (
                        <svg viewBox="0 0 200 180" className="w-full h-full fill-none stroke-gray-300 stroke-1">
                          <rect x="20" y="15" width="160" height="50" fill="currentColor" className="fill-gray-200" rx="4" />
                          <circle cx="50" cy="40" r="12" fill="currentColor" className="fill-gray-300" />
                          <line x1="30" y1="85" x2="170" y2="85" />
                          <line x1="30" y1="100" x2="170" y2="100" />
                          <line x1="30" y1="115" x2="130" y2="115" />
                          <rect x="30" y="135" width="140" height="22" rx="2" fill="currentColor" className="fill-gray-300" />
                        </svg>
                      )}
                      {t.id === 'two_column' && (
                        <svg viewBox="0 0 200 180" className="w-full h-full fill-none stroke-gray-300 stroke-1">
                          <line x1="20" y1="20" x2="100" y2="20" strokeWidth="2" stroke="currentColor" className="stroke-gray-200" />
                          <line x1="120" y1="20" x2="180" y2="20" strokeWidth="8" stroke="currentColor" className="stroke-gray-300" />
                          <line x1="20" y1="50" x2="100" y2="50" />
                          <line x1="20" y1="65" x2="100" y2="65" />
                          <line x1="20" y1="80" x2="80" y2="80" />
                          <line x1="120" y1="50" x2="180" y2="50" />
                          <line x1="120" y1="65" x2="180" y2="65" />
                          <line x1="120" y1="80" x2="160" y2="80" />
                          <rect x="20" y="110" width="160" height="25" rx="2" fill="currentColor" className="fill-gray-300" />
                        </svg>
                      )}
                    </>
                  ) : (
                    <svg viewBox="0 0 200 180" className="w-full h-full fill-none stroke-gray-300 stroke-1">
                      <rect x="20" y="20" width="160" height="140" rx="4" />
                      <path d="M 50 50 Q 100 80 150 50" strokeWidth="2" />
                    </svg>
                  )}
                </div>
                
                {/* Content */}
                <div className="relative z-10 text-center">
                  <LayoutIcon size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-600 text-gray-700">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.id === 'default' && 'Classic layout'}
                    {t.id === 'minimal' && 'Simple & clean'}
                    {t.id === 'branded' && 'With branding'}
                    {t.id === 'two_column' && 'Side-by-side'}
                    {isPageBuilder && 'Custom page'}
                  </p>
                </div>
                
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#e8556d] flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${cardCls}`}>
        <h3 className={sectionTitleCls}>Checkout Fields</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'email', label: 'Email', collect: collectEmail, setCollect: setCollectEmail, required: requiredEmail, setRequired: setRequiredEmail },
            { key: 'name', label: 'Name', collect: collectName, setCollect: setCollectName, required: requiredName, setRequired: setRequiredName },
            { key: 'phone', label: 'Phone', collect: collectPhone, setCollect: setCollectPhone, required: requiredPhone, setRequired: setRequiredPhone },
            { key: 'address', label: 'Address', collect: collectAddress, setCollect: setCollectAddress, required: requiredAddress, setRequired: setRequiredAddress },
            { key: 'company', label: 'Company', collect: collectCompany, setCollect: setCollectCompany, required: false, setRequired: setCollectCompany },
          ].map(field => (
            <div key={field.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm text-gray-700">{field.label}</span>
              <div className="flex items-center gap-2">
                {field.key !== 'company' && (
                  <>
                    <span className="text-[10px] text-gray-400">Req</span>
                    <PinkToggle value={field.required ?? false} onChange={(v) => field.setRequired(v)} />
                  </>
                )}
                <PinkToggle value={field.collect} onChange={field.setCollect} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <div>
          <label className={labelCls}>Custom Checkout Headline</label>
          <input value={customHeadline} onChange={e => setCustomHeadline(e.target.value)} placeholder="e.g. Complete Your Purchase" className={inputCls} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-500 text-gray-700">Show Order Summary</label>
          <PinkToggle value={showOrderSummary} onChange={setShowOrderSummary} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-500 text-gray-700">Coupon Code Field</label>
          <PinkToggle value={showCoupon} onChange={setShowCoupon} />
        </div>
      </div>
    </div>
  );
}

function LayoutIcon(props: any) {
  return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
}

// ── Step 6 — Bumps ────────────────────────────────────────────────────────────

interface Bump { id: string; name: string; price: string; description: string; checkboxLabel: string; imageUrl: string; enabled: boolean; }

function Step6Bumps({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const [bumps, setBumps] = useState<Bump[]>((meta.orderBumps as Bump[]) ?? []);
  const [saving, setSaving] = useState(false);

  const addBump = () => { if (bumps.length >= 3) { toast.error('Maximum 3 order bumps'); return; } setBumps(prev => [...prev, { id: `bump_${Date.now()}`, name: '', price: '', description: '', checkboxLabel: '', imageUrl: '', enabled: true }]); };
  const updateBump = (id: string, patch: Partial<Bump>) => setBumps(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  const removeBump = (id: string) => setBumps(prev => prev.filter(b => b.id !== id));

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      const metadata = { ...meta, orderBumps: bumps };
      const hasEnabled = bumps.some(b => b.enabled);
      await patchProduct(productId, { metadata, hasOrderBump: hasEnabled });
      onUpdate({ metadata, hasOrderBump: hasEnabled });
      toast.success('Order bumps saved');
      onNext();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }, [bumps, productId, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <p className="text-sm text-gray-500">Add up to 3 order bumps — one-time offers shown on the checkout page.</p>
      {bumps.map((bump, idx) => (
        <div key={bump.id} className={`${cardCls} border-l-4 ${bump.enabled ? 'border-l-[#e8556d]' : 'border-l-gray-300'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-600 text-gray-400">Bump {idx + 1}</span>
              <PinkToggle value={bump.enabled} onChange={v => updateBump(bump.id, { enabled: v })} />
              <span className="text-xs text-gray-400">{bump.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <button onClick={() => removeBump(bump.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Bump Name</label><input value={bump.name} onChange={e => updateBump(bump.id, { name: e.target.value })} placeholder="e.g. Premium Upgrade" className={inputCls} /></div>
            <div><label className={labelCls}>Price ($)</label><input type="number" step="0.01" value={bump.price} onChange={e => updateBump(bump.id, { price: e.target.value })} placeholder="9.99" className={inputCls} /></div>
            <div className="col-span-2"><label className={labelCls}>Description</label><textarea value={bump.description} onChange={e => updateBump(bump.id, { description: e.target.value })} rows={2} placeholder="Describe this bump offer..." className={`${inputCls} resize-none`} /></div>
            <div><label className={labelCls}>Checkbox Label</label><input value={bump.checkboxLabel} onChange={e => updateBump(bump.id, { checkboxLabel: e.target.value })} placeholder="Yes! Add this to my order" className={inputCls} /></div>
            <div><label className={labelCls}>Image URL</label><input value={bump.imageUrl} onChange={e => updateBump(bump.id, { imageUrl: e.target.value })} placeholder="https://..." className={inputCls} /></div>
          </div>
        </div>
      ))}
      {bumps.length < 3 && (
        <button onClick={addBump} className="flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-300 text-sm text-gray-500 rounded-xl hover:border-[#e8556d] hover:text-[#e8556d] transition-colors">
          <Plus size={14} /> Add Order Bump
        </button>
      )}
    </div>
  );
}

// ── Step 7 — Funnel ───────────────────────────────────────────────────────────

interface FunnelStep { 
  id: string; 
  type: 'sales_page' | 'upsell' | 'downsell' | 'order_bump' | 'order_confirmation' | 'custom'; 
  pageTemplate: string; 
  name: string;
  price?: string;
  currency?: string;
  acceptNextStep?: number | string | null;
  declineNextStep?: number | string | null;
  stripePriceId?: string;
}

function Step7Funnel({ productId, funnelId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>((meta.funnelSteps as FunnelStep[]) ?? [
    { id: 's1', type: 'sales_page', pageTemplate: '', name: 'Sales Page' },
    { id: 's2', type: 'order_confirmation', pageTemplate: '', name: 'Order Confirmation' },
  ]);
  const [funnelName, setFunnelName] = useState((meta.funnelName as string) ?? 'Default Funnel');
  const [saving, setSaving] = useState(false);
  // Template list from pagebuilder for step template selection
  const [templates, setTemplates] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    fetch('/api/pagebuilder/pages')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.pages)) {
          setTemplates(d.pages.map((p: any) => ({ id: p.id, label: p.name })));
        }
      })
      .catch(() => {});
  }, []);

  const addStep = () => setFunnelSteps(prev => [...prev, { id: `s_${Date.now()}`, type: 'upsell', pageTemplate: '', name: `Step ${prev.length + 1}`, price: '', currency: 'usd', acceptNextStep: null, declineNextStep: null, stripePriceId: '' }]);
  const updateStep = (id: string, patch: Partial<FunnelStep>) => setFunnelSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const removeStep = (id: string) => setFunnelSteps(prev => prev.filter(s => s.id !== id));
  const moveStep = (id: string, dir: 'up' | 'down') => {
    const idx = funnelSteps.findIndex(s => s.id === id);
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === funnelSteps.length - 1)) return;
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    const updated = [...funnelSteps];
    [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
    setFunnelSteps(updated);
  };

  const stepTypeIcons: Record<string, React.ElementType> = { sales_page: Globe, upsell: TrendingUp, downsell: TrendingDown, order_confirmation: CheckCircle, custom: Settings };

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      // Map wizard step types to DB step_type enum
      const mapStepType = (type: string): 'upsell' | 'downsell' => {
        if (type === 'downsell') return 'downsell';
        return 'upsell'; // upsell, sales_page, order_confirmation, custom all map to 'upsell'
      };

      const dbSteps = funnelSteps.map((s, i) => ({
        name: s.name,
        step_type: mapStepType(s.type),
        step_order: i + 1,
        html_content: s.pageTemplate || null,
      }));

      let resolvedFunnelId: string | null = null;

      if (funnelId) {
        // Update existing funnel
        const res = await fetch(`/api/upsell/funnels/${funnelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: funnelName,
            trigger_product_id: productId,
            steps: dbSteps,
          }),
        });
        if (!res.ok) throw new Error(`Failed to update funnel (${res.status})`);
        resolvedFunnelId = funnelId;
      } else {
        // Create new funnel
        const res = await fetch(`/api/upsell/funnels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: funnelName,
            trigger_product_id: productId,
            is_active: false,
            steps: dbSteps,
          }),
        });
        if (!res.ok) throw new Error(`Failed to create funnel (${res.status})`);
        const json = await res.json();
        resolvedFunnelId = json.funnel?.id ?? json.id ?? null;
      }

      const metadata = {
        ...meta,
        funnelName,
        funnelSteps,
        funnelDbId: resolvedFunnelId,
      };

      await patchProduct(productId, {
        metadata,
        hasUpsell: funnelSteps.some(s => s.type === 'upsell' || s.type === 'downsell'),
      });
      onUpdate({ metadata });
      toast.success('Funnel saved');
      onNext();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }, [funnelSteps, funnelName, productId, funnelId, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div><label className={labelCls}>Funnel Name</label><input value={funnelName} onChange={e => setFunnelName(e.target.value)} className={inputCls} placeholder="My Sales Funnel" /></div>
      <div className="space-y-4">
        {funnelSteps.map((step, idx) => {
          const Icon = stepTypeIcons[step.type] || Settings;
          const showBranching = step.type === 'upsell' || step.type === 'downsell';
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <button onClick={() => moveStep(step.id, 'up')} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"><ChevronLeft size={10} className="rotate-90" /></button>
                <div className="w-8 h-8 rounded-full bg-[#e8556d]/10 border-2 border-[#e8556d]/30 flex items-center justify-center"><Icon size={14} className="text-[#e8556d]" /></div>
                <button onClick={() => moveStep(step.id, 'down')} disabled={idx === funnelSteps.length - 1} className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"><ChevronLeft size={10} className="-rotate-90" /></button>
              </div>
              <div className={`${cardCls} flex-1`}>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>Step Name</label><input value={step.name} onChange={e => updateStep(step.id, { name: e.target.value })} className={inputCls} /></div>
                  <div><label className={labelCls}>Type</label>
                    <select value={step.type} onChange={e => updateStep(step.id, { type: e.target.value as FunnelStep['type'] })} className={inputCls}>
                      <option value="sales_page">Sales Page</option><option value="upsell">Upsell</option><option value="downsell">Downsell</option><option value="order_bump">Order Bump</option><option value="order_confirmation">Order Confirmation</option><option value="custom">Custom</option>
                    </select>
                  </div>
                  {showBranching && (
                    <>
                      <div><label className={labelCls}>Price ($)</label><input type="number" step="0.01" value={step.price ?? ''} onChange={e => updateStep(step.id, { price: e.target.value })} className={inputCls} placeholder="0.00" /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelCls}>Accept → Step</label>
                          <input type="number" min={1} value={step.acceptNextStep ?? ''} onChange={e => updateStep(step.id, { acceptNextStep: e.target.value })} className={inputCls} placeholder="Next step order" />
                        </div>
                        <div><label className={labelCls}>Decline → Step</label>
                          <input type="number" min={1} value={step.declineNextStep ?? ''} onChange={e => updateStep(step.id, { declineNextStep: e.target.value })} className={inputCls} placeholder="Fallback step" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <label className={labelCls}>Page Template</label>
                    <div className="flex gap-2">
                      <select value={step.pageTemplate} onChange={e => updateStep(step.id, { pageTemplate: e.target.value })} className={`${inputCls} flex-1`}>
                        <option value="">Select a template...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => removeStep(step.id)} className="mt-2 p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
      <button onClick={addStep} className="flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-300 text-sm text-gray-500 rounded-xl hover:border-[#e8556d] hover:text-[#e8556d] transition-colors">
        <Plus size={14} /> Add Step
      </button>
    </div>
  );
}

function TrendingUp(props: any) { return <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
function TrendingDown(props: any) { return <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>}

// ── Step 8 — Fulfillment ──────────────────────────────────────────────────────

function Step8Fulfillment({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const [fulfillmentType, setFulfillmentType] = useState((meta.fulfillmentType as string) ?? 'self');
  const [weight, setWeight] = useState(productData.weight ? String(productData.weight) : '');
  const [weightUnit, setWeightUnit] = useState('lbs');
  const [length, setLength] = useState((meta.dimLength as string) ?? '');
  const [width, setWidth] = useState((meta.dimWidth as string) ?? '');
  const [height, setHeight] = useState((meta.dimHeight as string) ?? '');
  const [shippingClass, setShippingClass] = useState((meta.shippingClass as string) ?? 'standard');
  const [thirdPartyApiKey, setThirdPartyApiKey] = useState((meta.thirdPartyApiKey as string) ?? '');
  const [thirdPartyEndpoint, setThirdPartyEndpoint] = useState((meta.thirdPartyEndpoint as string) ?? '');
  const [notifyFulfillment, setNotifyFulfillment] = useState((meta.notifyFulfillment as boolean) ?? false);
  const [saving, setSaving] = useState(false);

  const fulfillmentTypes = [
    { value: 'self', label: 'Self', desc: 'You handle fulfillment yourself', icon: Package },
    { value: 'third_party', label: 'Third-Party Warehouse', desc: 'External warehouse handles shipping', icon: Truck },
    { value: 'digital', label: 'Digital', desc: 'Auto-generated download links', icon: Download },
    { value: 'print_on_demand', label: 'Print-on-Demand', desc: 'POD service prints and ships', icon: PrinterIcon },
  ];

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      const metadata = { ...meta, fulfillmentType, dimLength: length, dimWidth: width, dimHeight: height, shippingClass, thirdPartyApiKey, thirdPartyEndpoint, notifyFulfillment };
      await patchProduct(productId, { weight: weight ? parseFloat(weight) : null, metadata });
      onUpdate({ metadata });
      toast.success('Fulfillment settings saved');
      onNext();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }, [fulfillmentType, weight, length, width, height, shippingClass, thirdPartyApiKey, thirdPartyEndpoint, notifyFulfillment, productId, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {fulfillmentTypes.map(ft => {
          const Icon = ft.icon;
          const selected = fulfillmentType === ft.value;
          return (
            <button key={ft.value} onClick={() => setFulfillmentType(ft.value)}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${selected ? 'border-[#e8556d] bg-[#e8556d]/5' : 'border-gray-200 hover:border-[#e8556d]/50'}`}>
              <Icon size={20} className="mb-2 text-[#e8556d]" />
              <p className="font-600 text-sm text-gray-900">{ft.label}</p>
              <p className="text-xs text-gray-500 mt-1">{ft.desc}</p>
            </button>
          );
        })}
      </div>

      {(fulfillmentType === 'self' || fulfillmentType === 'third_party') && (
        <div className={`${cardCls} grid grid-cols-2 gap-4`}>
          <div>
            <label className={labelCls}>Weight</label>
            <div className="flex">
              <input type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0" className={`${inputCls} rounded-r-none`} />
              <select value={weightUnit} onChange={e => setWeightUnit(e.target.value)} className="w-16 px-2 rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 text-xs outline-none">
                <option>lbs</option><option>oz</option><option>kg</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Shipping Class</label>
            <select value={shippingClass} onChange={e => setShippingClass(e.target.value)} className={inputCls}>
              <option value="standard">Standard</option><option value="expedited">Expedited</option><option value="overnight">Overnight</option><option value="freight">Freight</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Dimensions (L × W × H)</label>
            <div className="flex gap-2">
              <input type="number" step="0.1" value={length} onChange={e => setLength(e.target.value)} placeholder="Length" className={inputCls} />
              <span className="text-gray-300 self-center">×</span>
              <input type="number" step="0.1" value={width} onChange={e => setWidth(e.target.value)} placeholder="Width" className={inputCls} />
              <span className="text-gray-300 self-center">×</span>
              <input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} placeholder="Height" className={inputCls} />
              <span className="text-sm text-gray-500 self-center">in</span>
            </div>
          </div>
        </div>
      )}

      {fulfillmentType === 'third_party' && (
        <div className={`${cardCls} grid grid-cols-2 gap-4`}>
          <div><label className={labelCls}>API Key</label><input type="password" value={thirdPartyApiKey} onChange={e => setThirdPartyApiKey(e.target.value)} placeholder="••••••••" className={inputCls} /></div>
          <div><label className={labelCls}>API Endpoint</label><input value={thirdPartyEndpoint} onChange={e => setThirdPartyEndpoint(e.target.value)} placeholder="https://..." className={inputCls} /></div>
          <div className="col-span-2 flex items-center justify-between">
            <label className="text-sm font-500 text-gray-700">Notify fulfillment center on order</label>
            <PinkToggle value={notifyFulfillment} onChange={setNotifyFulfillment} />
          </div>
        </div>
      )}

      {fulfillmentType === 'digital' && (
        <div className="py-8 text-center">
          <Download size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Download links will be auto-generated after purchase.</p>
        </div>
      )}
    </div>
  );
}

function PrinterIcon(props: any) { return <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>}

// ── Step 9 — Affiliates ───────────────────────────────────────────────────────

function Step9Affiliates({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const affiliateMeta = (meta.affiliates as Record<string, any>) ?? {};
  const [enabled, setEnabled] = useState(affiliateMeta.enabled ?? false);
  const [tier1Type, setTier1Type] = useState<'percentage' | 'fixed'>(affiliateMeta.tier1Type ?? 'percentage');
  const [tier1Rate, setTier1Rate] = useState(affiliateMeta.tier1Rate ?? '15');
  const [tier2Type, setTier2Type] = useState<'percentage' | 'fixed'>(affiliateMeta.tier2Type ?? 'percentage');
  const [tier2Rate, setTier2Rate] = useState(affiliateMeta.tier2Rate ?? '5');
  const [cookieDays, setCookieDays] = useState(affiliateMeta.cookieDays ?? '30');
  const [autoApprove, setAutoApprove] = useState(affiliateMeta.autoApprove ?? true);
  const [minPayout, setMinPayout] = useState(affiliateMeta.minPayout ?? '50');
  const [signupPageUrl, setSignupPageUrl] = useState(affiliateMeta.signupUrl ?? affiliateMeta.signupPageUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [goaffproConnected, setGoaffproConnected] = useState(false);

  useEffect(() => {
    fetch('/api/integrations/settings?provider=goaffpro')
      .then(r => r.json())
      .then(d => {
        const connected = d.settings?.goaffpro?.connected || !!d.settings?.goaffpro?.envConnected;
        setGoaffproConnected(connected);
      })
      .catch(() => {});
  }, []);

  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin) }, []);

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      const signupUrl = signupPageUrl || `${origin}/affiliates/signup`;
      const metadata = {
        ...meta,
        affiliates: {
          ...affiliateMeta,
          enabled,
          tier1Type,
          tier1Rate,
          tier2Type,
          tier2Rate,
          cookieDays,
          autoApprove,
          minPayout,
          signupUrl,
        },
      };
      await patchProduct(productId, { metadata });
      onUpdate({ metadata });

      if (enabled && goaffproConnected) {
        fetch('/api/goaffpro/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, name: productData.name, description: productData.description, price: productData.price, slug: productData.slug }),
        }).catch(() => {});
      }

      toast.success('Affiliate settings saved');
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }, [enabled, tier1Type, tier1Rate, tier2Type, tier2Rate, cookieDays, autoApprove, minPayout, signupPageUrl, productId, productData, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p className="text-sm font-600 text-gray-900">Enable Affiliate Program</p>
          <p className="text-xs text-gray-500 mt-0.5">Allow affiliates to earn commission on each sale</p>
        </div>
        <PinkToggle value={enabled} onChange={setEnabled} />
      </div>
      {enabled && (
        <>
          <div className={`${cardCls} grid grid-cols-2 gap-4`}>
            <div className="col-span-2"><h4 className={sectionTitleCls}>Commission Structure</h4></div>
            <div>
              <label className={labelCls}>Tier 1 (Affiliate) Rate</label>
              <div className="flex gap-2">
                <input type="number" value={tier1Rate} onChange={e => setTier1Rate(e.target.value)} className={`${inputCls} flex-1`} />
                <select value={tier1Type} onChange={e => setTier1Type(e.target.value as 'percentage' | 'fixed')} className="w-28 px-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none">
                  <option value="percentage">%</option><option value="fixed">Fixed ($)</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Tier 2 (JV Broker) Rate</label>
              <div className="flex gap-2">
                <input type="number" value={tier2Rate} onChange={e => setTier2Rate(e.target.value)} className={`${inputCls} flex-1`} />
                <select value={tier2Type} onChange={e => setTier2Type(e.target.value as 'percentage' | 'fixed')} className="w-28 px-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none">
                  <option value="percentage">%</option><option value="fixed">Fixed ($)</option>
                </select>
              </div>
            </div>
            <div><label className={labelCls}>Cookie Duration (days)</label><input type="number" value={cookieDays} onChange={e => setCookieDays(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Minimum Payout ($)</label><input type="number" step="0.01" value={minPayout} onChange={e => setMinPayout(e.target.value)} className={inputCls} /></div>
            <div className="col-span-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-500 text-gray-700">GoAffPro Sync</p>
                <p className="text-xs text-gray-500">{goaffproConnected ? 'GoAffPro connection active' : 'Connect GoAffPro in Settings to sync products automatically'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${goaffproConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {goaffproConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
          <div className={`${cardCls}`}>
            <label className={labelCls}>Custom Affiliate Signup Page URL</label>
            <input value={signupPageUrl} onChange={e => setSignupPageUrl(e.target.value)} placeholder="https://yoursite.com/affiliate-signup" className={inputCls} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 10 — Proof ───────────────────────────────────────────────────────────

interface Testimonial { id: string; name: string; title?: string; photoUrl?: string; rating: number; text: string; }

function Step10Proof({ productId, productData, onUpdate, onNext, onRegisterSaveHandler }: StepProps) {
  const meta = productData.metadata ?? {};
  const proofMeta = (meta.proof as Record<string, any>) ?? {};
  const [proofEnabled, setProofEnabled] = useState(proofMeta.enabled ?? false);
  const [showReviews, setShowReviews] = useState(proofMeta.showReviews ?? false);
  const [showStars, setShowStars] = useState(proofMeta.showStars ?? false);
  const [reviewSource, setReviewSource] = useState(proofMeta.reviewSource ?? 'manual');
  const [showNotifications, setShowNotifications] = useState(proofMeta.showNotifications ?? false);
  const [notifDuration, setNotifDuration] = useState(proofMeta.notifDuration ?? '5');
  const [testimonials, setTestimonials] = useState<Testimonial[]>((proofMeta.testimonials as Testimonial[]) ?? (meta.testimonials as Testimonial[]) ?? []);
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);

  const addTestimonial = () => {
    if (!newName || !newText) {
      toast.error('Name and testimonial text required');
      return;
    }
    setTestimonials(prev => [...prev, { id: `t_${Date.now()}`, name: newName, title: newTitle, photoUrl: newPhoto, rating: newRating, text: newText }]);
    setNewName('');
    setNewTitle('');
    setNewPhoto('');
    setNewRating(5);
    setNewText('');
  };
  const removeTestimonial = (id: string) => setTestimonials(prev => prev.filter(t => t.id !== id));
  const saveEverything = async () => {
    const metadata = {
      ...meta,
      proof: {
        ...proofMeta,
        enabled: proofEnabled,
        showReviews,
        showStars,
        reviewSource,
        showNotifications,
        notifDuration,
        testimonials,
      },
    };
    await patchProduct(productId, { metadata });
    return metadata;
  };

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      const metadata = await saveEverything();
      onUpdate({ metadata });
      toast.success('Proof settings saved');
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [proofEnabled, showReviews, showStars, reviewSource, showNotifications, notifDuration, testimonials, productId, onUpdate, onNext]);

  useEffect(() => {
    onRegisterSaveHandler(handleContinue);
  }, [onRegisterSaveHandler, handleContinue]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-gray-400" />
          <div>
            <p className="text-sm font-600 text-gray-900">Enable Social Proof</p>
            <p className="text-xs text-gray-500 mt-0.5">Show reviews, testimonials, and purchase notifications</p>
          </div>
        </div>
        <PinkToggle value={proofEnabled} onChange={setProofEnabled} />
      </div>
      {proofEnabled && (
        <>
          <div className={`${cardCls} space-y-4`}>
            <div className="flex items-center justify-between"><label className="text-sm font-500 text-gray-700">Show Review Widget</label><PinkToggle value={showReviews} onChange={setShowReviews} /></div>
            <div className="flex items-center justify-between"><label className="text-sm font-500 text-gray-700">Star Rating Display</label><PinkToggle value={showStars} onChange={setShowStars} /></div>
            <div>
              <label className={labelCls}>Review Source</label>
              <select value={reviewSource} onChange={e => setReviewSource(e.target.value)} className={inputCls}>
                <option value="manual">Manual entry</option><option value="import">Import reviews</option><option value="verified">Verified purchases only</option>
              </select>
            </div>
          </div>
          <div className={`${cardCls}`}>
            <div className="flex items-center justify-between mb-4"><h3 className={sectionTitleCls}>Testimonials</h3></div>
            {testimonials.map(t => (
              <div key={t.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {t.photoUrl ? <img src={t.photoUrl} className="w-full h-full rounded-full object-cover" /> : <UserIcon size={14} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-500 text-gray-900">{t.name}</span>
                    {t.title && <span className="text-xs text-gray-400">{t.title}</span>}
                    <div className="flex gap-0.5 ml-auto">{[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= t.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />)}</div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{t.text}</p>
                </div>
                <button onClick={() => removeTestimonial(t.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 size={12} /></button>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-sm font-600 text-gray-700 mb-3">Add Testimonial</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Name</label><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Reviewer name" className={inputCls} /></div>
                <div><label className={labelCls}>Title</label><input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Verified Buyer" className={inputCls} /></div>
                <div><label className={labelCls}>Photo URL</label><input value={newPhoto} onChange={e => setNewPhoto(e.target.value)} placeholder="https://..." className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Rating</label>
                  <div className="flex gap-1 pt-1">{[1,2,3,4,5].map(s => (<button key={s} onClick={() => setNewRating(s)} className="p-0.5"><Star size={16} className={s <= newRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} /></button>))}</div>
                </div>
                <div className="col-span-2"><label className={labelCls}>Testimonial Text</label><textarea value={newText} onChange={e => setNewText(e.target.value)} rows={2} placeholder="What they said..." className={`${inputCls} resize-none`} /></div>
                <button onClick={addTestimonial} className="flex items-center gap-1.5 px-4 py-2 bg-[#e8556d] text-white text-xs font-500 rounded-lg hover:opacity-90 transition-opacity">
                  <Plus size={12} /> Add Testimonial
                </button>
              </div>
            </div>
          </div>
          <div className={`${cardCls} space-y-3`}>
            <div className="flex items-center justify-between"><label className="text-sm font-500 text-gray-700">Show purchase notifications</label><PinkToggle value={showNotifications} onChange={setShowNotifications} /></div>
            {showNotifications && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500">Display duration:</label>
                <input type="number" value={notifDuration} onChange={e => setNotifDuration(e.target.value)} className="w-20 px-2 py-1.5 rounded border border-gray-200 text-sm outline-none" />
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserIcon(props: any) { return <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}

// ── Step 11 — Finish ──────────────────────────────────────────────────────────

function Step11Finish({ productId, productData, onClose, funnelId }: StepProps & { onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState(productData.status === 'active');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin) }, []);

  const previewUrl = origin ? `${origin}/p/${productData.slug || productData.id}` : '';

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // 1) Mark product active
      await patchProduct(productId, { status: 'active' });

      // 2) Activate the funnel in the DB if it was created during step 7
      const funnelDbId = (productData.metadata?.funnelDbId as string) ?? null;
      if (funnelDbId) {
        fetch(`/api/upsell/funnels/${funnelDbId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: true }),
        }).catch(() => {});
      }

      // 3) Publish merchant pages referenced by checkout template/pagebuilder.
      //    The checkout template page list is stored in /merchant-pages/checkout-templates,
      //    and ProductWizard selection is stored in metadata.checkout.template.
      //    If the template is a MerchantPagebuilder-backed pageId, publish it.
      const checkoutTemplateId = ((productData?.metadata as any)?.checkout?.template ?? '').toString().trim();
      if (checkoutTemplateId && checkoutTemplateId.startsWith('page_')) {
        const pageId = checkoutTemplateId.replace(/^page_/, '');
        await fetch('/api/merchant-pages/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId, storeId: (productData as any)?.storeId }),
        }).catch(() => {});
      }

      setPublished(true);
      setStatus(true);
      toast.success('Product published!');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    setPublishing(true);
    try {
      await patchProduct(productId, { status: 'draft' });
      setStatus(false);
      toast.success('Saved as draft');
    } catch (e) { toast.error((e as Error).message); } finally { setPublishing(false); }
  };

  const handleCopyLink = () => { navigator.clipboard.writeText(previewUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Link copied!'); };

  const summaryItems = [
    { label: 'Product Name', value: productData.name },
    { label: 'Product Type', value: productData.type },
    { label: 'Status', value: status ? 'Active' : 'Draft' },
  ];

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 py-4">
      {published ? (
        <>
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Rocket size={36} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-700 text-gray-900">Product Published!</h2>
            <p className="text-gray-500 mt-1">Your product is now live and ready for customers.</p>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#e8556d] text-white text-sm font-500 rounded-lg hover:opacity-90">
              <Eye size={14} /> View Product
            </a>
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Back to Dashboard</button>
          </div>
        </>
      ) : (
        <>
          <div className="w-full">
            <h3 className={sectionTitleCls}>Product Summary</h3>
            <div className={`${cardCls}`}>
              {summaryItems.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-500 text-gray-900 capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-500 text-gray-700">Product Status</label>
            <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {status ? 'Active' : 'Draft'}
            </span>
            <PinkToggle value={status} onChange={setStatus} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 px-6 py-2.5 bg-[#e8556d] text-white text-sm font-500 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-[#e8556d]/20">
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
              Publish Product
            </button>
            <button onClick={handleSaveDraft} disabled={publishing} className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-sm font-500 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
              <Save size={14} /> Save as Draft
            </button>
          </div>
          <div className="flex items-center gap-3">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#e8556d] hover:underline">
              <Eye size={14} /> Preview Product
            </a>
            <button onClick={handleCopyLink} className="flex items-center gap-1.5 text-sm text-[#e8556d] hover:underline">
              {copied ? <><Check size={14} /> Copied</> : <><Link2 size={14} /> Copy Share Link</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main ProductWizard Component ──────────────────────────────────────────────

const WIZARD_STEPS: WizardStep[] = [
  { num: 1, label: 'Info', icon: FileText },
  { num: 2, label: 'Pricing', icon: DollarSign },
  { num: 3, label: 'Gateways', icon: CreditCard },
  { num: 4, label: 'Contents', icon: Package },
  { num: 5, label: 'Checkout', icon: ShoppingCart },
  { num: 6, label: 'Bumps', icon: Layers },
  { num: 7, label: 'Funnel', icon: GitFork },
  { num: 8, label: 'Fulfillment', icon: Truck },
  { num: 9, label: 'Affiliates', icon: Users },
  { num: 10, label: 'Proof', icon: ThumbsUp },
  { num: 11, label: 'Finish', icon: Rocket },
];

interface Props {
  productId: string;
  funnelId: string;
  onClose: () => void;
}

export default function ProductWizard({ productId, funnelId, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    let canceled = false;
    const loadProduct = async () => {
      setLoading(true);
      if (productId === 'new') {
        if (!canceled) {
          setProductData({ id: 'new', name: '', slug: '', type: 'physical', price: 0, status: 'draft', metadata: {} });
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        const p = data.product ?? data;
        if (!p || !p.id) throw new Error('Product not found');

        if (!canceled) {
          setProductData({
            ...p,
            metadata: typeof p.metadata === 'object' && p.metadata !== null ? p.metadata : {},
          });
        }
      } catch (error) {
        if (!canceled) {
          setProductData({ id: productId, name: '', slug: '', type: 'physical', price: 0, status: 'draft', metadata: {} });
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    loadProduct();
    return () => {
      canceled = true;
    };
  }, [productId]);

  const handleUpdate = useCallback((patch: Record<string, unknown>) => {
    setProductData(prev => {
      if (!prev) return prev;
      const merged: ProductData = { ...prev, ...patch };
      if (patch.metadata && typeof patch.metadata === 'object') {
        merged.metadata = { ...(prev.metadata ?? {}), ...(patch.metadata as Record<string, unknown>) };
      }
      return merged;
    });
  }, []);

  const goToStep = (step: number) => {
    if (!visitedSteps.has(step) && step > currentStep) return;
    setCurrentStep(step);
  };

  const goNext = () => {
    // If we're moving to step 4 but product type is 'physical', skip to step 5
    if (currentStep + 1 === 4 && productData?.type === 'physical') {
      setCurrentStep(5);
      setVisitedSteps(prev => new Set([...prev, 4, 5]));
      return;
    }
    const next = Math.min(WIZARD_STEPS.length, currentStep + 1);
    setCurrentStep(next);
    setVisitedSteps(prev => new Set(prev).add(next));
  };

  const goPrev = () => {
    setCurrentStep(s => Math.max(1, s - 1));
  };

  const handleSave = async () => {
    console.log('handleSave fired, saveHandlerRef.current:', !!saveHandlerRef.current);
    // Prefer the registered step save handler (has full validation & payload)
    if (saveHandlerRef.current) {
      await saveHandlerRef.current();
      return;
    }
    if (!productData) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = { metadata: productData.metadata };
      // Include scalar fields so POST (new product) has a name
      if (productData.name) patch.name = productData.name;
      if (productData.description) patch.description = productData.description;
      if (productData.type) patch.type = productData.type;
      if (productData.price > 0) patch.price = Math.round(productData.price * 100);
      if (productData.slug) patch.slug = productData.slug;
      const result = await patchProduct(productData.id, patch);
      const updatePatch: Record<string, unknown> = {};
      if (result?.id && result.id !== productData.id) updatePatch.id = result.id;
      if (result?.slug) updatePatch.slug = result.slug;
      if (Object.keys(updatePatch).length) handleUpdate(updatePatch);
      toast.success('Progress saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Register save handler (must be before early return to avoid React hook error #310)
  const registerSaveHandler = useCallback((handler: () => Promise<void>) => {
    saveHandlerRef.current = handler;
  }, []);

  const handleSaveAndContinue = useCallback(async () => {
    console.log('handleSaveAndContinue: saveHandlerRef.current:', !!saveHandlerRef.current);
    if (saveHandlerRef.current) {
      await saveHandlerRef.current();
    } else {
      console.error('No save handler registered - skipping save and proceeding to next step');
      goNext();
    }
  }, []);

  if (loading || !productData) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const stepProps: StepProps = {
    productId: productData.id,
    funnelId,
    productData,
    onUpdate: handleUpdate,
    onNext: goNext,
    onPrev: goPrev,
    onRegisterSaveHandler: registerSaveHandler,
  };

  const currentWizardStep = WIZARD_STEPS[currentStep - 1];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Mobile step progress bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-3 py-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {WIZARD_STEPS.map(step => {
            const isActive = currentStep === step.num;
            const isCompleted = visitedSteps.has(step.num) && step.num < currentStep;
            return (
              <button key={step.num} onClick={() => goToStep(step.num)} disabled={!visitedSteps.has(step.num)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  isActive ? 'bg-[#e8556d]/10 text-[#e8556d] font-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                {isCompleted ? <Check size={10} /> : isActive ? <step.icon size={10} /> : null}
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Left sidebar (hidden on mobile) ── */}
      <div className="hidden md:flex w-56 flex-shrink-0 border-r border-gray-200 bg-white flex-col overflow-y-auto">
        <div className="px-4 pt-6 pb-3">
          <p className="text-[10px] font-600 text-gray-400 uppercase tracking-wider">Product Setup</p>
        </div>
        <nav className="flex-1">
          {WIZARD_STEPS.map(step => {
            const isActive = currentStep === step.num;
            const isCompleted = visitedSteps.has(step.num) && step.num < currentStep;
            const isClickable = visitedSteps.has(step.num);
            const Icon = step.icon;
            return (
              <button
                key={step.num}
                onClick={() => goToStep(step.num)}
                disabled={!isClickable}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${
                  isActive ? 'bg-[#e8556d]/5 border-r-2 border-[#e8556d]' : isClickable ? 'hover:bg-gray-50 border-r-2 border-transparent' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-600 flex-shrink-0 ${
                  isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-[#e8556d] text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? <Check size={12} /> : <Icon size={12} />}
                </span>
                <span className={isActive ? 'text-gray-900 font-600' : 'text-gray-500'}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden pt-12 md:pt-0">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 flex-shrink-0">
              <X size={14} className="text-gray-500" />
            </button>
            <div className="h-6 w-px bg-gray-200 flex-shrink-0" />
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-600 text-gray-900 truncate">{productData.name || 'New Product'}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-500 border flex-shrink-0 ${
                productData.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {productData.status === 'active' ? 'Active' : 'Draft'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-sm font-500 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span className="hidden sm:inline">Save</span>
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-[#e8556d] text-white text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
              Exit
            </button>
          </div>
        </div>

        {/* Step title */}
        <div className="shrink-0 px-4 md:px-6 pt-6 pb-2">
          <h2 className="text-lg font-700 text-gray-900">Step {currentStep}: {currentWizardStep.label}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentStep === 1 && 'Enter basic product information'}
            {currentStep === 2 && 'Set up pricing and payment plans'}
            {currentStep === 3 && 'Configure payment gateways'}
            {currentStep === 4 && 'Upload content and configure delivery'}
            {currentStep === 5 && 'Customize the checkout experience'}
            {currentStep === 6 && 'Add order bump offers'}
            {currentStep === 7 && 'Build your sales funnel'}
            {currentStep === 8 && 'Configure fulfillment settings'}
            {currentStep === 9 && 'Set up affiliate program'}
            {currentStep === 10 && 'Add social proof and testimonials'}
            {currentStep === 11 && 'Review and publish your product'}
          </p>
        </div>

        {/* Scrollable step content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {currentStep === 1 && <Step1Info {...stepProps} />}
            {currentStep === 2 && <Step2Pricing {...stepProps} />}
            {currentStep === 3 && <Step3Gateways {...stepProps} />}
            {currentStep === 4 && <Step4Contents {...stepProps} />}
            {currentStep === 5 && <Step5Checkout {...stepProps} />}
            {currentStep === 6 && <Step6Bumps {...stepProps} />}
            {currentStep === 7 && <Step7Funnel {...stepProps} />}
            {currentStep === 8 && <Step8Fulfillment {...stepProps} />}
            {currentStep === 9 && <Step9Affiliates {...stepProps} />}
            {currentStep === 10 && <Step10Proof {...stepProps} />}
            {currentStep === 11 && <Step11Finish {...stepProps} onClose={onClose} funnelId={funnelId} />}

          </div>
        </div>

        {/* Footer navigation */}
        <div className="shrink-0 bg-white border-t border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between">
          <button onClick={goPrev} disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-500 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors">
            <ChevronLeft size={14} /> Back
          </button>
          <span className="text-xs text-gray-400">{currentStep} of {WIZARD_STEPS.length}</span>
          {currentStep < WIZARD_STEPS.length ? (
            <button onClick={handleSaveAndContinue}
              className="flex items-center gap-2 px-4 py-2 bg-[#e8556d] text-white text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
              Save & Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
              <Rocket size={14} /> Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
