'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, AlertCircle, ChevronRight, CreditCard, Users, Mail, Globe, ShieldCheck, Rocket, RefreshCw, Play, Store, User, Loader2, XCircle, Save, Upload } from 'lucide-react';


// ============================================================
// TYPES
// ============================================================

type StoreStatus = 'DRAFT' | 'CONFIGURING' | 'READY_FOR_LAUNCH' | 'LIVE' | 'SUSPENDED';
type OnboardingStep =
  | 'account_setup' |'store_configuration' |'stripe_connection' |'goaffpro_setup' |'brevo_setup' |'storefront_upload' |'validation_check' |'go_live';

interface ValidationCheck {
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  message: string;
  critical: boolean;
}

interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  storeStatus: StoreStatus;
  stepData: Record<string, Record<string, unknown>>;
  canGoLive: boolean;
  blockers: string[];
}

interface Page {
  id: string;
  name: string;
  slug: string;
  pageType: string;
  isCore: boolean;
  status: string;
}

// ============================================================
// STEP DEFINITIONS
// ============================================================

const STEPS: Array<{
  id: OnboardingStep;
  label: string;
  description: string;
  icon: React.ElementType;
  optional?: boolean;
}> = [
  { id: 'account_setup', label: 'Account Setup', description: 'Create merchant profile and initialize tenant', icon: User },
  { id: 'store_configuration', label: 'Store Configuration', description: 'Name, domain, branding, and currency', icon: Store },
  { id: 'stripe_connection', label: 'Stripe Connection', description: 'Connect payment processor and verify webhooks', icon: CreditCard },
  { id: 'goaffpro_setup', label: 'Affiliate Setup', description: 'Connect GoAffPro and validate SDK', icon: Users, optional: true },
  { id: 'brevo_setup', label: 'Email System', description: 'Connect Brevo and verify sender domain', icon: Mail, optional: true },
  { id: 'storefront_upload', label: 'Storefront Upload', description: 'Upload HTML storefront and preview rendering', icon: Globe },
  { id: 'validation_check', label: 'Validation Check', description: 'Run automated pre-launch checks', icon: ShieldCheck },
  { id: 'go_live', label: 'Go Live', description: 'Activate store and enable production traffic', icon: Rocket },
];

const STATUS_COLORS: Record<StoreStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  CONFIGURING: 'bg-blue-100 text-blue-700',
  READY_FOR_LAUNCH: 'bg-amber-100 text-amber-700',
  LIVE: 'bg-success-bg text-success',
  SUSPENDED: 'bg-red-100 text-red-700',
};

// ============================================================
// HELPER: save step data without completing
// ============================================================

async function saveStepData(step: OnboardingStep, data: Record<string, unknown>) {
  await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save_step', step, data }),
  });
}

// ============================================================
// STEP FORM COMPONENTS
// ============================================================

function StepAccountSetup({
  initialData,
  onComplete,
  onSave,
}: {
  initialData: Record<string, unknown>;
  onComplete: (data: Record<string, unknown>) => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    fullName: (initialData.fullName as string) ?? '',
    businessName: (initialData.businessName as string) ?? '',
    email: (initialData.email as string) ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Set up your merchant profile and initialize your tenant workspace.</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-600 text-foreground mb-1">Full Name</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="e.g. John Doe"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs font-600 text-foreground mb-1">Business Name</label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            placeholder="e.g. My Store"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs font-600 text-foreground mb-1">Business Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@yourbusiness.com"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!form.businessName || !form.email || saving}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => onComplete(form)}
          disabled={!form.businessName || !form.email}
          className="flex-1 py-2.5 bg-foreground text-background text-sm font-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepStoreConfig({
  initialData,
  businessName,
  onComplete,
  onSave,
}: {
  initialData: Record<string, unknown>;
  businessName: string;
  onComplete: (data: Record<string, unknown>) => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    storeName: (initialData.storeName as string) || businessName || '',
    domain: (initialData.domain as string) || '',
    currency: (initialData.currency as string) || 'USD',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Configure your store identity, domain, and branding.</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-600 text-foreground mb-1">Store Name</label>
          <input
            type="text"
            value={form.storeName}
            onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
            placeholder="My Awesome Store"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs font-600 text-foreground mb-1">Store Domain / Slug</label>
          <input
            type="text"
            value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            placeholder="my-store"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs font-600 text-foreground mb-1">Default Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="CAD">CAD — Canadian Dollar</option>
            <option value="AUD">AUD — Australian Dollar</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => onComplete(form)}
          disabled={!form.storeName || !form.domain}
          className="flex-1 py-2.5 bg-foreground text-background text-sm font-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepStripeConnection({ onComplete }: { onComplete: (data: Record<string, unknown>) => void }) {
  const hasKey = !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY !== 'your-stripe-publishable-key-here');
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Connect your Stripe account to enable payments, subscriptions, and webhooks.</p>
      <div className={`rounded-lg border p-4 ${hasKey ? 'border-success/30 bg-success-bg/50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-center gap-2">
          {hasKey ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-amber-600" />}
          <span className="text-sm font-600">{hasKey ? 'Stripe keys detected in environment' : 'Stripe keys not configured'}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {hasKey
            ? 'STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY are set. Webhook endpoint: /api/webhooks/stripe' :'Add STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, and STRIPE_WEBHOOK_SECRET to your environment variables.'}
        </p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-600 text-foreground">Webhook endpoint to register in Stripe Dashboard:</p>
        <code className="block bg-background border border-border rounded px-2 py-1 font-mono">
          {process.env.NEXT_PUBLIC_SITE_URL ?? 'https://your-domain.com'}/api/webhooks/stripe
        </code>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onComplete({ connected: true, webhookEndpoint: '/api/webhooks/stripe' })}
          className="flex-1 py-2.5 bg-foreground text-background text-sm font-600 rounded-lg hover:opacity-90 transition-opacity"
        >
          {hasKey ? 'Confirm Stripe Connection' : 'Mark as Configured'}
        </button>
        <button
          onClick={() => onComplete({ skipped: true })}
          className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function StepGoAffPro({ onComplete }: { onComplete: (data: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Connect GoAffPro to enable affiliate tracking, commissions, and the affiliate dashboard.</p>
      <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2">
        <p className="font-600 text-foreground">Required environment variables:</p>
        <code className="block bg-background border border-border rounded px-2 py-1 font-mono">GOAFFPRO_ACCESS_TOKEN=your-token</code>
        <code className="block bg-background border border-border rounded px-2 py-1 font-mono">GOAFFPRO_WEBHOOK_SECRET=your-secret</code>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p className="font-600 mb-1">GoAffPro Webhook URL:</p>
        <code className="font-mono">{process.env.NEXT_PUBLIC_SITE_URL ?? 'https://your-domain.com'}/api/webhooks/goaffpro</code>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onComplete({ connected: true, sdkValidated: true })}
          className="flex-1 py-2.5 bg-foreground text-background text-sm font-600 rounded-lg hover:opacity-90 transition-opacity"
        >
          Confirm GoAffPro Setup
        </button>
        <button
          onClick={() => onComplete({ connected: false, skipped: true })}
          className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function StepBrevo({ onComplete }: { onComplete: (data: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Connect Brevo to enable transactional emails, automation flows, and abandoned cart recovery.</p>
      <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2">
        <p className="font-600 text-foreground">Required environment variables:</p>
        <code className="block bg-background border border-border rounded px-2 py-1 font-mono">BREVO_API_KEY=your-key</code>
        <code className="block bg-background border border-border rounded px-2 py-1 font-mono">BREVO_WEBHOOK_SECRET=your-secret</code>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p className="font-600 mb-1">Brevo Webhook URL:</p>
        <code className="font-mono">{process.env.NEXT_PUBLIC_SITE_URL ?? 'https://your-domain.com'}/api/webhooks/brevo</code>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onComplete({ connected: true, senderVerified: true })}
          className="flex-1 py-2.5 bg-foreground text-background text-sm font-600 rounded-lg hover:opacity-90 transition-opacity"
        >
          Confirm Brevo Setup
        </button>
        <button
          onClick={() => onComplete({ connected: false, skipped: true })}
          className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function StepStorefront({
  onComplete,
  onSave,
}: {
  onComplete: (data: Record<string, unknown>) => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [html, setHtml] = useState('');
  const [targetPage, setTargetPage] = useState('homepage');
  const [pages, setPages] = useState<Page[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch available pages
    fetch('/api/pagebuilder/pages')
      .then((r) => r.json())
      .then((d) => setPages(d.pages ?? []))
      .catch(() => {});
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setHtml(ev.target?.result as string ?? '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!html.trim()) return;
    setUploading(true);
    setError(null);

    // Find the target page by slug
    const slugMap: Record<string, string> = {
      homepage: '/',
      checkout: '/checkout',
      thank_you: '/checkout/success',
    };
    const targetSlug = slugMap[targetPage] ?? '/';
    const page = pages.find((p) => p.slug === targetSlug);

    try {
      if (page) {
        // Update existing page
        const res = await fetch(`/api/pagebuilder/pages/${page.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error ?? 'Failed to upload HTML');
        }
      } else {
        // Create a new page with the HTML
        const slug = targetSlug;
        const name = targetPage === 'homepage' ? 'Homepage' : targetPage === 'checkout' ? 'Checkout' : 'Thank You';
        const res = await fetch('/api/pagebuilder/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, slug, type: targetPage, html }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error ?? 'Failed to create page');
        }
      }

      await onSave({ uploaded: true, pageSlug: targetSlug });
      onComplete({ uploaded: true, pageSlug: targetSlug });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Upload HTML for your storefront pages. The engine sanitizes, parses, and injects dynamic data bindings.</p>

      {/* Target page selector */}
      <div>
        <label className="block text-xs font-600 text-foreground mb-1">Target Page</label>
        <select
          value={targetPage}
          onChange={(e) => setTargetPage(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="homepage">Homepage</option>
          <option value="checkout">Checkout Page</option>
          <option value="thank_you">Thank You Page</option>
        </select>
      </div>

      {/* HTML textarea */}
      <div>
        <label className="block text-xs font-600 text-foreground mb-1">HTML Content</label>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="Paste your HTML here..."
          rows={8}
          className="w-full px-3 py-2 text-sm font-mono border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* File upload alternative */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer transition-colors">
          <Upload size={14} />
          Upload .html file
          <input
            type="file"
            accept=".html,.htm"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!html.trim() || uploading}
        className="w-full py-2.5 bg-foreground text-background text-sm font-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? 'Uploading...' : `Submit HTML to ${targetPage}`}
      </button>
    </div>
  );
}

function StepValidation({
  onComplete,
  onRunValidation,
}: {
  onComplete: (data: Record<string, unknown>) => void;
  onRunValidation: () => Promise<{ checks: ValidationCheck[]; canLaunch: boolean; score: number; blockers: string[] }>;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ checks: ValidationCheck[]; canLaunch: boolean; score: number; blockers: string[] } | null>(null);

  const run = async () => {
    setRunning(true);
    try {
      const r = await onRunValidation();
      setResult(r);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Run automated checks to verify your store is ready for production traffic.</p>
      {!result ? (
        <button
          onClick={run}
          disabled={running}
          className="w-full py-2.5 bg-foreground text-background text-sm font-600 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {running ? 'Running checks...' : 'Run Validation Checks'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-lg border p-3 ${result.canLaunch ? 'border-success/30 bg-success-bg/50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-600">{result.canLaunch ? '✅ Ready for launch' : '❌ Issues found'}</span>
              <span className="text-sm font-700">{result.score}/100</span>
            </div>
          </div>
          <div className="space-y-2">
            {result.checks.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {c.status === 'pass' ? (
                  <CheckCircle2 size={14} className="text-success mt-0.5 flex-shrink-0" />
                ) : c.status === 'warning' ? (
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle size={14} className="text-destructive mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <span className="font-600 text-foreground">{c.check}</span>
                  <span className="text-muted-foreground ml-1">— {c.message}</span>
                </div>
              </div>
            ))}
          </div>
          {result.blockers.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-600 text-red-700 mb-1">Blocking issues:</p>
              {result.blockers.map((b, i) => (
                <p key={i} className="text-xs text-red-600">• {b}</p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={run}
              className="flex items-center gap-1.5 px-3 py-2 border border-border text-xs font-500 rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw size={12} />
              Re-run
            </button>
            {result.canLaunch && (
              <button
                onClick={() => onComplete({ validated: true, score: result.score })}
                className="flex-1 py-2 bg-foreground text-background text-xs font-600 rounded-lg hover:opacity-90 transition-opacity"
              >
                Continue to Go Live →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepGoLive({
  onGoLive,
  canGoLive,
  blockers,
  storeStatus,
}: {
  onGoLive: () => Promise<void>;
  canGoLive: boolean;
  blockers: string[];
  storeStatus: StoreStatus;
}) {
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(storeStatus === 'LIVE');

  const handleGoLive = async () => {
    setLaunching(true);
    try {
      await onGoLive();
      setLaunched(true);
    } finally {
      setLaunching(false);
    }
  };

  if (launched) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mx-auto">
          <Rocket size={28} className="text-success" />
        </div>
        <div>
          <h3 className="text-lg font-700 text-foreground">Store is LIVE! 🎉</h3>
          <p className="text-sm text-muted-foreground mt-1">Your store is now accepting real traffic and payments.</p>
        </div>
        <div className="bg-success-bg/50 border border-success/20 rounded-lg p-3 text-xs text-success space-y-1">
          <p>✅ Production mode enabled</p>
          <p>✅ CDN caching activated</p>
          <p>✅ Heightened monitoring active</p>
          <p>✅ Webhook alerts enabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Activate your store for real-world traffic. This enables production mode, CDN caching, and monitoring.</p>
      {blockers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-600 text-red-700 mb-1">Cannot go live — resolve these first:</p>
          {blockers.map((b, i) => <p key={i} className="text-xs text-red-600">• {b}</p>)}
        </div>
      )}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
        <p className="font-600">Going live will:</p>
        <p>• Enable production Stripe payments</p>
        <p>• Activate CDN edge caching</p>
        <p>• Start heightened monitoring</p>
        <p>• Enable webhook failure alerts</p>
      </div>
      <button
        onClick={handleGoLive}
        disabled={!canGoLive || launching}
        className="w-full py-3 bg-success text-white text-sm font-700 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {launching ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
        {launching ? 'Activating...' : 'Go Live Now'}
      </button>
    </div>
  );
}

// ============================================================
// MAIN ONBOARDING WIZARD
// ============================================================

export default function OnboardingWizard() {
  const [progress, setProgress] = useState<OnboardingProgress>({
    currentStep: 'account_setup',
    completedSteps: [],
    storeStatus: 'DRAFT',
    canGoLive: false,
    blockers: [],
    stepData: {},
  });
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<OnboardingStep>('account_setup');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/onboarding');
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
        setActiveStep(data.progress.currentStep);
      }
    } catch {
      // Use default state if API unavailable
    } finally {
      setLoading(false);
    }
  };

  const completeStep = async (step: OnboardingStep, data: Record<string, unknown> = {}) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_step', step, data }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Failed to save step. Please try again.');
        return;
      }
      setProgress(result.progress);
      // Move to next step
      const allSteps = STEPS.map((s) => s.id);
      const nextIdx = allSteps.indexOf(step) + 1;
      if (nextIdx < allSteps.length) {
        setActiveStep(allSteps[nextIdx]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save step. Please try again.');
    }
  };

  const saveStep = async (step: OnboardingStep, data: Record<string, unknown> = {}) => {
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_step', step, data }),
    });
    if (res.ok) {
      // Refresh progress to get updated stepData
      await fetchProgress();
    }
  };

  const runValidation = async () => {
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run_validation' }),
    });
    const data = await res.json();
    return data.validation;
  };

  const handleGoLive = async () => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'go_live' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to activate store.');
        return;
      }
      if (data.result?.success) {
        setProgress((p) => ({ ...p, storeStatus: 'LIVE', canGoLive: false }));
      } else if (data.result?.blockers) {
        setError(data.result.blockers.join(', '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate store.');
    }
  };

  const router = useRouter();

  const handleSkipOnboarding = async () => {
    try {
      const res = await fetch('/api/onboarding/quick-setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to skip onboarding.');
        return;
      }
      router.push('/pagebuilder');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip onboarding.');
    }
  };

  const isCompleted = (step: OnboardingStep) => progress.completedSteps.includes(step);

  const completedCount = progress.completedSteps.length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Merchant Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete all steps to launch your store</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkipOnboarding}
            className="px-3 py-2 text-xs font-600 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Skip Onboarding
          </button>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border ${STATUS_COLORS[progress.storeStatus]} border-current/20`}>
            <span className={`w-1.5 h-1.5 rounded-full bg-current ${progress.storeStatus === 'LIVE' ? 'animate-pulse' : ''}`} />
            {progress.storeStatus.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-600 text-foreground">Setup Progress</span>
          <span className="text-sm font-700 text-primary">{progressPct}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{completedCount} of {STEPS.length} steps completed</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Two-column layout: steps list + active step form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-600 text-foreground">Setup Steps</p>
          </div>
          <div className="divide-y divide-border">
            {STEPS.map((step, idx) => {
              const completed = isCompleted(step.id);
              const isActive = activeStep === step.id;
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive ? 'bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    completed ? 'bg-success text-white' : isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {completed ? <CheckCircle2 size={14} /> : <span className="text-xs font-700">{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-600 truncate ${isActive ? 'text-primary' : completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      {step.optional && (
                        <span className="text-[9px] font-500 text-muted-foreground bg-muted px-1 rounded">optional</span>
                      )}
                    </div>
                  </div>
                  {completed && <CheckCircle2 size={12} className="text-success flex-shrink-0" />}
                  {isActive && !completed && <ChevronRight size={12} className="text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active step form */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center gap-3">
            {(() => {
              const step = STEPS.find((s) => s.id === activeStep);
              const Icon = step?.icon ?? Circle;
              return (
                <>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-600 text-foreground">{step?.label}</p>
                    <p className="text-xs text-muted-foreground">{step?.description}</p>
                  </div>
                  {isCompleted(activeStep) && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-success font-600">
                      <CheckCircle2 size={12} />
                      Completed
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          <div className="p-5">
            {activeStep === 'account_setup' && (
              <StepAccountSetup
                initialData={progress.stepData.account_setup ?? {}}
                onComplete={(data) => completeStep('account_setup', data)}
                onSave={(data) => saveStep('account_setup', data)}
              />
            )}
            {activeStep === 'store_configuration' && (
              <StepStoreConfig
                initialData={progress.stepData.store_configuration ?? {}}
                businessName={(progress.stepData.account_setup?.businessName as string) ?? ''}
                onComplete={(data) => completeStep('store_configuration', data)}
                onSave={(data) => saveStep('store_configuration', data)}
              />
            )}
            {activeStep === 'stripe_connection' && (
              <StepStripeConnection onComplete={(data) => completeStep('stripe_connection', data)} />
            )}
            {activeStep === 'goaffpro_setup' && (
              <StepGoAffPro onComplete={(data) => completeStep('goaffpro_setup', data)} />
            )}
            {activeStep === 'brevo_setup' && (
              <StepBrevo onComplete={(data) => completeStep('brevo_setup', data)} />
            )}
            {activeStep === 'storefront_upload' && (
              <StepStorefront
                onComplete={(data) => completeStep('storefront_upload', data)}
                onSave={(data) => saveStep('storefront_upload', data)}
              />
            )}
            {activeStep === 'validation_check' && (
              <StepValidation
                onComplete={(data) => completeStep('validation_check', data)}
                onRunValidation={runValidation}
              />
            )}
            {activeStep === 'go_live' && (
              <StepGoLive
                onGoLive={handleGoLive}
                canGoLive={progress.canGoLive}
                blockers={progress.blockers}
                storeStatus={progress.storeStatus}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}