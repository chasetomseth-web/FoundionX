'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings, CreditCard, Link2, Mail, Globe, Shield, Bell, Zap,
  CheckCircle, AlertCircle, ExternalLink, ChevronRight, Eye, EyeOff,
  Loader2, RefreshCw, Key, Info, Save, MapPin, BarChart3, Users, Code, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import ProfileSettingsSection from './ProfileSettingsSection';
import SecuritySection from './SecuritySection';
import NotificationsSection from './NotificationsSection';
import TeamSection from './TeamSection';
import BillingSection from './BillingSection';
import ConnectedAccountsSection from './ConnectedAccountsSection';
import DeveloperSection from './DeveloperSection';
import PreferencesSection from './PreferencesSection';
import PrivacySection from './PrivacySection';


interface IntegrationStatus {
  connected: boolean;
  details?: string;
  error?: string;
  testing?: boolean;
  saving?: boolean;
}

interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  hint?: string;
}

interface IntegrationConfig {
  id: 'stripe' | 'goaffpro' | 'brevo';
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  fields: IntegrationField[];
  docsUrl: string;
  docsLabel: string;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing, subscriptions, and billing',
    icon: CreditCard,
    color: 'bg-primary/10 text-primary',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    docsLabel: 'Get Stripe API Keys',
    fields: [
      {
        key: 'publishableKey',
        label: 'Publishable Key',
        placeholder: 'pk_live_...',
        hint: 'Used on the frontend for Stripe.js',
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        placeholder: 'sk_live_...',
        secret: true,
        hint: 'Used server-side for API calls',
      },
      {
        key: 'webhookSecret',
        label: 'Webhook Signing Secret',
        placeholder: 'whsec_...',
        secret: true,
        hint: 'From Stripe Dashboard → Webhooks',
      },
    ],
  },
  {
    id: 'goaffpro',
    name: 'GoAffPro',
    description: 'Affiliate tracking, commissions, and payouts',
    icon: Link2,
    color: 'bg-success-bg text-success',
    docsUrl: 'https://app.goaffpro.com/settings/developer',
    docsLabel: 'GoAffPro Developer Settings',
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token (X-GOAFFPRO-ACCESS-TOKEN)',
        placeholder: '61388d...3f1ee6',
        secret: true,
        hint: 'GoAffPro → Settings → Developer → X-GOAFFPRO-ACCESS-TOKEN',
      },
      {
        key: 'publicToken',
        label: 'Public Token (X-GOAFFPRO-PUBLIC-TOKEN)',
        placeholder: 'a7cca0...2cc95e',
        secret: true,
        hint: 'GoAffPro → Settings → Developer → X-GOAFFPRO-PUBLIC-TOKEN',
      },
    ],
  },
  {
    id: 'brevo',
    name: 'Brevo',
    description: 'Transactional emails, automation, and broadcasts',
    icon: Mail,
    color: 'bg-info-bg text-info',
    docsUrl: 'https://app.brevo.com/settings/keys/api',
    docsLabel: 'Get Brevo API Key',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        placeholder: 'xkeysib-...',
        secret: true,
        hint: 'Found in Brevo → Settings → API Keys',
      },
    ],
  },
];

const settingsSections = [
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Zap,
    items: [],
  },
  {
    id: 'store',
    label: 'Store Settings',
    icon: Globe,
    items: ['Store name & URL', 'Currency & timezone', 'Tax settings', 'Shipping zones', 'Legal pages'],
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: Users,
    items: [],
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    items: [],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    items: [],
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    items: [],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    items: [],
  },
  {
    id: 'connected',
    label: 'Connected Accounts',
    icon: Link2,
    items: [],
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: Code,
    items: [],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Settings,
    items: [],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: Lock,
    items: [],
  },
];

function IntegrationCard({ config }: { config: IntegrationConfig }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<IntegrationStatus>({ connected: false });
  const [expanded, setExpanded] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load saved credentials from DB on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const dbRes = await fetch('/api/integrations/settings');
        const dbData = await dbRes.json();
        const saved = dbData.settings?.[config.id];

        if (saved?.credentials) {
          setValues(saved.credentials);
        }

        if (saved?.connected) {
          setStatus({ connected: true, details: saved.details ?? 'Connected' });
        } else {
          setStatus({ connected: false });
        }
      } catch {
        // Silently fail — non-critical
      }
    }
    loadSettings();
  }, [config.id]);

  const handleTest = async () => {
    const primaryField = config.fields[0];
    const apiKey = values[primaryField.key];
    const secretKey = values['secretKey'];
    const publicToken = values['publicToken'];

    if (!apiKey && !status.connected) {
      setStatus({ connected: false, error: 'Please enter your API key first' });
      return;
    }

    setStatus((prev) => ({ ...prev, testing: true, error: undefined }));

    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.id,
          apiKey: apiKey || 'env',
          secretKey,
          publicToken,
        }),
      });
      const data = await res.json();
      setStatus({ connected: data.connected, details: data.details, error: data.error, testing: false });

      if (data.connected) {
        // Auto-save on successful test
        await saveCredentials(data.connected, data.details);
      }
    } catch {
      setStatus({ connected: false, error: 'Connection test failed', testing: false });
    }
  };

  const saveCredentials = async (connected: boolean, details?: string) => {
    setStatus((prev) => ({ ...prev, saving: true }));
    try {
      await fetch('/api/integrations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.id,
          credentials: values,
          connected,
          details,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      // Silently fail
    } finally {
      setStatus((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleSave = async () => {
    await saveCredentials(status.connected, status.details);
  };

  const Icon = config.icon;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.color}`}>
            <Icon size={16} />
          </div>
          <div>
            <p className="font-600 text-foreground text-sm">{config.name}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status.connected ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-500 bg-success-bg text-success">
              <CheckCircle size={11} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-500 bg-muted text-muted-foreground">
              <AlertCircle size={11} /> Not connected
            </span>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-primary font-500 hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            {expanded ? 'Collapse' : 'Configure'} <ExternalLink size={10} />
          </button>
        </div>
      </div>

      {/* Status details */}
      {status.connected && status.details && (
        <div className="mx-4 mb-3 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          {status.details}
        </div>
      )}
      {status.error && (
        <div className="mx-4 mb-3 text-xs text-danger bg-danger-bg rounded-lg px-3 py-2 flex items-center gap-1.5">
          <AlertCircle size={12} /> {status.error}
        </div>
      )}

      {/* Expanded form */}
      {expanded && (
        <div className="border-t border-border p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-600 text-foreground flex items-center gap-1.5">
              <Key size={12} /> API Credentials
            </p>
            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:opacity-80 flex items-center gap-1"
            >
              {config.docsLabel} <ExternalLink size={10} />
            </a>
          </div>

          {config.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-500 text-foreground">{field.label}</label>
              <div className="relative">
                <input
                  type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="w-full h-9 px-3 pr-9 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
                {field.secret && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets((s) => ({ ...s, [field.key]: !s[field.key] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
              {field.hint && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info size={10} /> {field.hint}
                </p>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={status.testing || status.saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {status.testing ? (
                <><Loader2 size={13} className="animate-spin" /> Testing…</>
              ) : (
                <><RefreshCw size={13} /> Test Connection</>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={status.saving || status.testing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {status.saving ? (
                <><Loader2 size={13} className="animate-spin" /> Saving…</>
              ) : (
                <><Save size={13} /> Save</>
              )}
            </button>
            {savedSuccess && (
              <span className="text-xs text-success flex items-center gap-1">
                <CheckCircle size={12} /> Saved successfully
              </span>
            )}
          </div>

          {/* Info note */}
          <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
            <p className="font-600 text-foreground mb-1 flex items-center gap-1">
              <CheckCircle size={11} className="text-success" /> Credentials are saved to your account
            </p>
            <p>Click <strong>Test Connection</strong> to verify, then <strong>Save</strong> to persist across all pages. Credentials are stored securely and remain active when you navigate away.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GatewaySettingsCard() {
  const [values, setValues] = useState({
    paypalEnabled: false,
    applePayEnabled: false,
    googlePayEnabled: false,
    bankTransferEnabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/integrations/settings?provider=payment_gateways')
      .then(r => r.json())
      .then(d => {
        const creds = d.settings?.payment_gateways?.credentials;
        if (creds) {
          setValues({
            paypalEnabled: creds.paypalEnabled === 'true' || creds.paypalEnabled === true,
            applePayEnabled: creds.applePayEnabled === 'true' || creds.applePayEnabled === true,
            googlePayEnabled: creds.googlePayEnabled === 'true' || creds.googlePayEnabled === true,
            bankTransferEnabled: creds.bankTransferEnabled === 'true' || creds.bankTransferEnabled === true,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveGateways = async () => {
    setSaving(true);
    try {
      await fetch('/api/integrations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'payment_gateways',
          credentials: {
            paypalEnabled: values.paypalEnabled,
            applePayEnabled: values.applePayEnabled,
            googlePayEnabled: values.googlePayEnabled,
            bankTransferEnabled: values.bankTransferEnabled,
          },
          connected: true,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch {
      toast.error('Failed to save payment gateway settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-600 text-foreground">Payment Gateways</p>
          <p className="text-xs text-muted-foreground mt-0.5">Enable the gateway options you want to expose for products and checkout.</p>
        </div>
        <button onClick={handleSaveGateways} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: 'paypalEnabled', label: 'PayPal' },
          { key: 'applePayEnabled', label: 'Apple Pay' },
          { key: 'googlePayEnabled', label: 'Google Pay' },
          { key: 'bankTransferEnabled', label: 'Bank Transfer' },
        ].map((option) => (
          <label key={option.key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-background cursor-pointer">
            <span className="text-sm text-foreground">{option.label}</span>
            <input type="checkbox" checked={values[option.key as keyof typeof values]} onChange={e => setValues(prev => ({ ...prev, [option.key]: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          </label>
        ))}
      </div>
      {savedSuccess && <div className="mt-3 text-xs text-success flex items-center gap-1"><CheckCircle size={12} /> Payment gateway settings saved.</div>}
    </div>
  );
}

function EmailSequencesCard() {
  const [sequences, setSequences] = useState({
    post_purchase_onboarding: '',
    subscriber_educational: '',
    cart_abandonment_recovery: '',
    subscription_winback: '',
    post_cancel_winback: '',
    vip_subscriber: '',
  });
  const [onboardingContent, setOnboardingContent] = useState({
    usageTips: '',
    habitFormation: '',
    testimonials: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load Brevo sequences
    fetch('/api/integrations/settings?provider=brevo_sequences')
      .then(r => r.json())
      .then(d => {
        if (d.settings?.brevo_sequences?.credentials) {
          setSequences({ ...sequences, ...d.settings.brevo_sequences.credentials });
        }
      })
      .catch(() => {});
    
    // Load onboarding content
    fetch('/api/integrations/settings?provider=onboarding_content')
      .then(r => r.json())
      .then(d => {
        if (d.settings?.onboarding_content?.credentials) {
          setOnboardingContent({ ...onboardingContent, ...d.settings.onboarding_content.credentials });
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/integrations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'brevo_sequences',
          credentials: sequences,
          connected: true,
        }),
      });
      
      await fetch('/api/integrations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'onboarding_content',
          credentials: onboardingContent,
          connected: true,
        }),
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';
  const textareaCls = 'w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-y';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-info-bg text-info">
            <Mail size={16} />
          </div>
          <div>
            <p className="font-600 text-foreground text-sm">Email Sequences & Onboarding</p>
            <p className="text-xs text-muted-foreground">Configure Brevo sequence IDs and onboarding email content</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-6">
        {/* Brevo Sequence IDs */}
        <div>
          <h4 className="text-sm font-600 text-foreground mb-3">Brevo Email Sequence IDs</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Post-Purchase Onboarding</label>
              <input
                value={sequences.post_purchase_onboarding}
                onChange={(e) => setSequences({ ...sequences, post_purchase_onboarding: e.target.value })}
                placeholder="List ID"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Subscriber Educational</label>
              <input
                value={sequences.subscriber_educational}
                onChange={(e) => setSequences({ ...sequences, subscriber_educational: e.target.value })}
                placeholder="List ID"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Cart Abandonment Recovery</label>
              <input
                value={sequences.cart_abandonment_recovery}
                onChange={(e) => setSequences({ ...sequences, cart_abandonment_recovery: e.target.value })}
                placeholder="List ID"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Subscription Win-Back</label>
              <input
                value={sequences.subscription_winback}
                onChange={(e) => setSequences({ ...sequences, subscription_winback: e.target.value })}
                placeholder="List ID"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Post-Cancel Win-Back</label>
              <input
                value={sequences.post_cancel_winback}
                onChange={(e) => setSequences({ ...sequences, post_cancel_winback: e.target.value })}
                placeholder="List ID"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">VIP Subscriber</label>
              <input
                value={sequences.vip_subscriber}
                onChange={(e) => setSequences({ ...sequences, vip_subscriber: e.target.value })}
                placeholder="List ID"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Onboarding Email Content */}
        <div>
          <h4 className="text-sm font-600 text-foreground mb-3">Onboarding Email Content</h4>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Usage Tips (HTML)</label>
              <textarea
                value={onboardingContent.usageTips}
                onChange={(e) => setOnboardingContent({ ...onboardingContent, usageTips: e.target.value })}
                placeholder="<p>Take one serving daily with water for best results.</p>"
                className={textareaCls}
              />
            </div>
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Habit Formation Message (HTML)</label>
              <textarea
                value={onboardingContent.habitFormation}
                onChange={(e) => setOnboardingContent({ ...onboardingContent, habitFormation: e.target.value })}
                placeholder="<p>Set a daily reminder to build this into your routine. Consistency is key!</p>"
                className={textareaCls}
              />
            </div>
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Customer Testimonials (HTML)</label>
              <textarea
                value={onboardingContent.testimonials}
                onChange={(e) => setOnboardingContent({ ...onboardingContent, testimonials: e.target.value })}
                placeholder='<p><em>"Amazing results!" - Customer Name</em></p>'
                className={textareaCls}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save Email Settings'}
          </button>
          {saved && (
            <span className="text-xs text-success flex items-center gap-1"><CheckCircle size={12} /> Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreSettingsSection() {
  const [store, setStore] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emailTemplates, setEmailTemplates] = useState<Record<string, boolean>>({});
  const [legalPages, setLegalPages] = useState({ terms: '', privacy: '' });
  const [customDomain, setCustomDomain] = useState('');

  useEffect(() => {
    fetch('/api/store/settings')
      .then((r) => r.json())
      .then((d) => { if (d.store) setStore(d.store); })
      .catch(() => {})
      .finally(() => setLoading(false));
    
    // Load email template states
    fetch('/api/integrations/settings?provider=email_template_states')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.email_template_states?.credentials) {
          setEmailTemplates(d.settings.email_template_states.credentials);
        }
      })
      .catch(() => {});
    
    // Load legal pages
    fetch('/api/integrations/settings?provider=legal_pages')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.legal_pages?.credentials) {
          setLegalPages(d.settings.legal_pages.credentials);
        }
      })
      .catch(() => {});
  }, []);

  const update = (key: string, value: string) => setStore((s) => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* noop */ }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Ship From Address */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-primary" />
          <h3 className="text-sm font-600 text-foreground">Ship From Address</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Pre-filled when creating shipping labels. This is your warehouse or return address.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Name / Company</label>
            <input value={store.fromAddressName ?? ''} onChange={(e) => update('fromAddressName', e.target.value)} placeholder="My Store" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Phone</label>
            <input value={store.fromAddressPhone ?? ''} onChange={(e) => update('fromAddressPhone', e.target.value)} placeholder="+1 555 000 0000" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-500 text-foreground block mb-1">Street Address</label>
            <input value={store.fromAddressStreet ?? ''} onChange={(e) => update('fromAddressStreet', e.target.value)} placeholder="123 Main St" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">City</label>
            <input value={store.fromAddressCity ?? ''} onChange={(e) => update('fromAddressCity', e.target.value)} placeholder="Austin" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">State</label>
            <input value={store.fromAddressState ?? ''} onChange={(e) => update('fromAddressState', e.target.value)} placeholder="TX" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">ZIP Code</label>
            <input value={store.fromAddressZip ?? ''} onChange={(e) => update('fromAddressZip', e.target.value)} placeholder="73301" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Country</label>
            <input value={store.fromAddressCountry ?? ''} onChange={(e) => update('fromAddressCountry', e.target.value)} placeholder="US" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Pixel / Tracking */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-primary" />
          <h3 className="text-sm font-600 text-foreground">Tracking Pixels</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">These IDs are injected into every published page's {'<head>'}.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Google Tag Manager ID</label>
            <input value={store.gtmId ?? ''} onChange={(e) => update('gtmId', e.target.value)} placeholder="GTM-XXXXXXX" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Facebook Pixel ID</label>
            <input value={store.facebookPixelId ?? ''} onChange={(e) => update('facebookPixelId', e.target.value)} placeholder="1234567890" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">TikTok Pixel ID</label>
            <input value={store.tiktokPixelId ?? ''} onChange={(e) => update('tiktokPixelId', e.target.value)} placeholder="Cxxxxxxxxxxxxxxxx" className={inputCls} />
          </div>
        </div>
      </section>

      {/* B.4 — Tax */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-primary" />
          <h3 className="text-sm font-600 text-foreground">Tax</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Requires Stripe Tax to be configured at <a href="https://dashboard.stripe.com/tax/registrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80">dashboard.stripe.com/tax/registrations</a>.</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex flex-col">
              <span className="text-sm font-500 text-foreground">Enable Automatic Tax Collection</span>
              <span className="text-xs text-muted-foreground">Calculate and collect tax using Stripe Tax</span>
            </div>
            <button
              onClick={async () => {
                const currentValue = store.taxEnabled === 'true' || store.taxEnabled === true;
                const newValue = !currentValue;
                update('taxEnabled', String(newValue));
                await fetch('/api/store/settings', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ taxEnabled: newValue }),
                });
              }}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${(store.taxEnabled === 'true' || (store.taxEnabled as any) === true) ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(store.taxEnabled === 'true' || (store.taxEnabled as any) === true) ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Tax Behavior</label>
            <select
              value={store.taxBehavior ?? 'exclusive'}
              onChange={(e) => update('taxBehavior', e.target.value)}
              className={inputCls}
            >
              <option value="exclusive">Exclusive — added on top</option>
              <option value="inclusive">Inclusive — included in price</option>
            </select>
          </div>
        </div>
      </section>

      {/* Mail Templates */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Mail size={16} className="text-primary" />
          <h3 className="text-sm font-600 text-foreground">Email Templates</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Control which transactional emails are sent to your customers.</p>
        <div className="space-y-2">
          {['Order Confirmation', 'Shipping Label Created', 'Order Shipped', 'Order Delivered', 'Refund Confirmation', 'Affiliate Welcome', 'Affiliate Commission Earned', 'Subscription Renewal', 'Failed Payment', 'Password Reset'].map((template) => (
            <div key={template} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-foreground">{template}</span>
              <button
                onClick={async () => {
                  const newValue = !emailTemplates[template];
                  setEmailTemplates({ ...emailTemplates, [template]: newValue });
                  await fetch('/api/integrations/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      provider: 'email_template_states',
                      credentials: { ...emailTemplates, [template]: newValue },
                    }),
                  });
                }}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${emailTemplates[template] !== false ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailTemplates[template] !== false ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Legal Pages */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-primary" />
          <h3 className="text-sm font-600 text-foreground">Legal Pages</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">These pages are accessible to your customers at /p/terms and /p/privacy.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Terms of Service</label>
            <textarea
              value={legalPages.terms}
              onChange={(e) => setLegalPages({ ...legalPages, terms: e.target.value })}
              placeholder="Enter your terms of service..."
              className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-y"
            />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Privacy Policy</label>
            <textarea
              value={legalPages.privacy}
              onChange={(e) => setLegalPages({ ...legalPages, privacy: e.target.value })}
              placeholder="Enter your privacy policy..."
              className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-y"
            />
          </div>
          <button
            onClick={async () => {
              await fetch('/api/integrations/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  provider: 'legal_pages',
                  credentials: legalPages,
                }),
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Save size={13} /> Save Legal Pages
          </button>
        </div>
      </section>

      {/* Custom Domain */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-primary" />
          <h3 className="text-sm font-600 text-foreground">Custom Domain</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Use your own domain instead of the default subdomain.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Custom Domain</label>
            <input
              value={customDomain || store.customDomain || ''}
              onChange={(e) => {
                setCustomDomain(e.target.value);
                update('customDomain', e.target.value);
              }}
              placeholder="yourdomain.com"
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Point your domain's CNAME record to this app's domain, then enter your domain above.
            </p>
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Current Subdomain</label>
            <input
              value={`${store.slug || 'yourstore'}.wiastro.com`}
              readOnly
              className={`${inputCls} bg-muted cursor-not-allowed`}
            />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : 'Save Store Settings'}
        </button>
        {saved && (
          <span className="text-xs text-success flex items-center gap-1"><CheckCircle size={12} /> Saved</span>
        )}
      </div>
    </div>
  );
}

export default function SettingsPageContent() {
  const [activeSection, setActiveSection] = useState('integrations');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-600 text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform configuration and integrations</p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="bg-card border border-border rounded-xl p-2 h-fit">
          {settingsSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors text-left ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <SectionIcon size={15} className="flex-shrink-0" />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {activeSection === 'integrations' ? (
            <>
              <div className="bg-card border border-border rounded-xl px-5 py-4">
                <p className="font-600 text-foreground">Connected Integrations</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect Stripe, GoAffPro, and Brevo to power payments, affiliates, and email from within wiastro. Credentials are saved and persist across all pages.
                </p>
              </div>
              {INTEGRATIONS.map((config) => (
                <IntegrationCard key={config.id} config={config} />
              ))}
              <GatewaySettingsCard />
              {/* Email Sequences & Onboarding Settings */}
              <EmailSequencesCard />
            </>
          ) : activeSection === 'store' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Store Settings</p>
              </div>
              <StoreSettingsSection />
            </div>
          ) : activeSection === 'profile' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Profile</p>
              </div>
              <ProfileSettingsSection />
            </div>
          ) : activeSection === 'team' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Team Management</p>
              </div>
              <TeamSection />
            </div>
          ) : activeSection === 'billing' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Billing</p>
              </div>
              <BillingSection />
            </div>
          ) : activeSection === 'security' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Security</p>
              </div>
              <SecuritySection />
            </div>
          ) : activeSection === 'notifications' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Notifications</p>
              </div>
              <NotificationsSection />
            </div>
          ) : activeSection === 'connected' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Connected Accounts</p>
              </div>
              <ConnectedAccountsSection />
            </div>
          ) : activeSection === 'developer' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Developer Settings</p>
              </div>
              <DeveloperSection />
            </div>
          ) : activeSection === 'preferences' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Preferences</p>
              </div>
              <PreferencesSection />
            </div>
          ) : activeSection === 'privacy' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="font-600 text-foreground">Privacy & Data</p>
              </div>
              <PrivacySection />
            </div>
          ) : null}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-danger-bg border border-danger/20 rounded-xl p-5">
        <p className="text-sm font-600 text-danger mb-1">Danger Zone</p>
        <p className="text-xs text-secondary-foreground mb-4">These actions are irreversible. Proceed with caution.</p>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-danger/30 text-danger text-sm font-500 rounded-lg hover:bg-danger/10 transition-colors">
            Reset Store Data
          </button>
          <button className="px-4 py-2 border border-danger/30 text-danger text-sm font-500 rounded-lg hover:bg-danger/10 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
