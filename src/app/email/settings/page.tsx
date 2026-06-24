'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings, Globe, Shield, CheckCircle, XCircle, AlertCircle,
  RefreshCw, User, Mail, Loader2, ExternalLink, Star
} from 'lucide-react';

interface Sender {
  id: number;
  name: string;
  email: string;
  active: boolean;
  ips?: string[];
}

interface AccountInfo {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  plan: { type: string; credits: number; creditsType: string };
}

export default function EmailSettingsPageContent() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainMsg, setDomainMsg] = useState('');
  const [defaultSenderEmail, setDefaultSenderEmail] = useState('');
  const [savingSender, setSavingSender] = useState('');
  const [senderSaveMsg, setSenderSaveMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sendersRes, accountRes, prefRes] = await Promise.all([
        fetch('/api/email/sender-domains'),
        fetch('/api/email/account'),
        fetch('/api/email/sender-preference'),
      ]);
      const sendersData = await sendersRes.json();
      setSenders(sendersData.senders ?? []);

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        setAccount(accountData);
      }

      if (prefRes.ok) {
        const prefData = await prefRes.json();
        setDefaultSenderEmail(prefData.senderEmail ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const setDefaultSender = async (sender: Sender) => {
    setSavingSender(sender.email);
    setSenderSaveMsg('');
    try {
      const res = await fetch('/api/email/sender-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail: sender.email, senderName: sender.name }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setDefaultSenderEmail(sender.email);
      setSenderSaveMsg(`✓ ${sender.name} <${sender.email}> set as default sender`);
      setTimeout(() => setSenderSaveMsg(''), 4000);
    } catch (e) {
      setSenderSaveMsg(e instanceof Error ? e.message : 'Failed to save sender');
    } finally {
      setSavingSender('');
    }
  };

  const addDomain = async () => {
    if (!domainInput.trim()) return;
    setAddingDomain(true);
    setDomainMsg('');
    try {
      const res = await fetch('/api/email/sender-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setDomainMsg('✓ Domain added. Check Brevo for DNS verification records.');
      setDomainInput('');
      fetchData();
    } catch (e) {
      setDomainMsg(e instanceof Error ? e.message : 'Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Email Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sender identity, domain verification, and Brevo configuration</p>
        </div>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-3 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-danger-bg border border-danger/20 rounded-xl p-4 text-sm text-danger">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div><p className="font-600">Error</p><p className="mt-0.5 text-xs">{error}</p></div>
        </div>
      )}

      {/* Account Info */}
      {account && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={15} className="text-primary" />
            <p className="font-600 text-foreground">Brevo Account</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Account Email</p>
              <p className="text-sm font-500 text-foreground mt-0.5">{account.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-500 text-foreground mt-0.5">{account.firstName} {account.lastName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="text-sm font-500 text-foreground mt-0.5">{account.companyName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-500 text-foreground mt-0.5 capitalize">{account.plan?.type ?? '—'}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Email Credits</p>
              <p className="text-sm font-500 text-foreground">{(account.plan?.credits ?? 0).toLocaleString()} {account.plan?.creditsType ?? ''}</p>
            </div>
            <a href="https://app.brevo.com/account/plan" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80">
              Manage Plan <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      {/* Verified Senders */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={15} className="text-primary" />
            <div>
              <p className="font-600 text-foreground">Verified Senders</p>
              <p className="text-xs text-muted-foreground mt-0.5">Set a default sender — it will be used for all transactional emails</p>
            </div>
          </div>
          <a href="https://app.brevo.com/senders/list" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80">
            Manage in Brevo <ExternalLink size={11} />
          </a>
        </div>

        {senderSaveMsg && (
          <div className={`px-5 py-2.5 text-xs font-500 border-b border-border ${senderSaveMsg.startsWith('✓') ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
            {senderSaveMsg}
          </div>
        )}

        {loading ? (
          <div className="p-5 animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
          </div>
        ) : senders.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No verified senders found. Add a sender in Brevo first.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {senders.map((s) => {
              const isDefault = s.email === defaultSenderEmail;
              return (
                <div key={s.id} className={`flex items-center justify-between px-5 py-3 transition-colors ${isDefault ? 'bg-primary/3' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-600 ${isDefault ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                      {s.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-500 text-foreground">{s.name}</p>
                        {isDefault && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-600">
                            <Star size={9} fill="currentColor" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-500 ${s.active ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
                      {s.active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                    {!isDefault && (
                      <button
                        onClick={() => setDefaultSender(s)}
                        disabled={savingSender === s.email}
                        className="h-7 px-3 border border-border rounded-lg text-xs font-500 text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {savingSender === s.email ? <Loader2 size={10} className="animate-spin" /> : <Star size={10} />}
                        Set Default
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && senders.length > 0 && !defaultSenderEmail && (
          <div className="px-5 py-3 bg-yellow-50 border-t border-yellow-100 flex items-center gap-2 text-xs text-yellow-700">
            <AlertCircle size={12} />
            No default sender set. Click "Set Default" on a sender to use it for all transactional emails.
          </div>
        )}
      </div>

      {/* Domain Verification */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={15} className="text-primary" />
          <p className="font-600 text-foreground">Domain Authentication</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Authenticate your sending domain to improve deliverability. Brevo will provide SPF and DKIM records to add to your DNS.
        </p>
        <div className="flex gap-2">
          <input value={domainInput} onChange={(e) => setDomainInput(e.target.value)} placeholder="yourdomain.com"
            className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
          <button onClick={addDomain} disabled={addingDomain || !domainInput.trim()}
            className="h-9 px-4 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {addingDomain ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            Add Domain
          </button>
        </div>
        {domainMsg && (
          <p className={`text-xs mt-2 ${domainMsg.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{domainMsg}</p>
        )}
        <div className="mt-4 p-4 bg-muted/30 rounded-xl">
          <div className="flex items-start gap-2">
            <Shield size={14} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-600 text-foreground">SPF / DKIM Authentication</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                After adding your domain, go to <a href="https://app.brevo.com/senders/domain/list" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Brevo → Senders → Domains</a> to get your DNS records. Add the SPF TXT record and DKIM CNAME records to your domain registrar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Brevo Dashboard Link */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-600 text-foreground">Brevo Dashboard</p>
          <p className="text-xs text-muted-foreground mt-0.5">Manage advanced settings, templates, and automations directly in Brevo</p>
        </div>
        <a href="https://app.brevo.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
          Open Brevo <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
