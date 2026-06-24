'use client';

import React, { useState } from 'react';
import { X, Globe, Copy, CheckCircle, AlertCircle, Info, ExternalLink, Plus, Loader2 } from 'lucide-react';

interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX';
  host: string;
  value: string;
  purpose: string;
}

interface SenderDomainPanelProps {
  onClose: () => void;
}

function generateDnsRecords(domain: string): DnsRecord[] {
  if (!domain) return [];
  return [
    {
      type: 'TXT',
      host: domain,
      value: `v=spf1 include:spf.sendinblue.com include:zoho.com mx ~all`,
      purpose: 'SPF — authorizes Brevo + Zoho to send on behalf of your domain',
    },
    {
      type: 'CNAME',
      host: `mail._domainkey.${domain}`,
      value: `mail._domainkey.${domain}.dkim.sendinblue.com`,
      purpose: 'DKIM — cryptographic signature for Brevo outbound emails',
    },
    {
      type: 'TXT',
      host: `_dmarc.${domain}`,
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}; fo=1`,
      purpose: 'DMARC — policy for handling unauthenticated emails',
    },
    {
      type: 'MX',
      host: domain,
      value: `mx.zoho.com (priority 10)`,
      purpose: 'MX — routes inbound email to your Zoho mailbox',
    },
    {
      type: 'TXT',
      host: `zoho._domainkey.${domain}`,
      value: `v=DKIM1; k=rsa; p=<your-zoho-dkim-public-key>`,
      purpose: 'DKIM for Zoho — get this value from Zoho Mail Admin Console',
    },
  ];
}

export default function SenderDomainPanel({ onClose }: SenderDomainPanelProps) {
  const [domain, setDomain] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const handleGenerate = () => {
    if (!domain) return;
    setRecords(generateDnsRecords(domain));
    if (!senderEmail) setSenderEmail(`hello@${domain}`);
  };

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleAddSender = async () => {
    if (!senderEmail || !senderName) return;
    setAdding(true);
    setAddResult(null);
    try {
      const res = await fetch('/api/email/sender-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: senderName, email: senderEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddResult({ success: true });
      } else {
        setAddResult({ error: data.error ?? 'Failed to add sender' });
      }
    } catch {
      setAddResult({ error: 'Network error' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="font-600 text-foreground flex items-center gap-2">
              <Globe size={16} className="text-primary" /> Custom Sender Domain
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect your Zoho mailbox as the sending address via Brevo
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Domain input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-600 text-foreground">Your Domain</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="yourbusiness.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/^https?:\/\//, ''))}
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleGenerate}
                disabled={!domain}
                className="px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Generate DNS Records
              </button>
            </div>
          </div>

          {/* Sender details */}
          {domain && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-600 text-foreground">Sender Name</label>
                <input
                  type="text"
                  placeholder="Your Business"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-600 text-foreground">Sender Email</label>
                <input
                  type="email"
                  placeholder={`hello@${domain}`}
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          )}

          {/* Add sender to Brevo */}
          {domain && senderEmail && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddSender}
                disabled={adding || !senderName || !senderEmail}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add Sender to Brevo
              </button>
              {addResult?.success && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle size={12} /> Sender added — verify in Brevo dashboard
                </span>
              )}
              {addResult?.error && (
                <span className="text-xs text-danger flex items-center gap-1">
                  <AlertCircle size={12} /> {addResult.error}
                </span>
              )}
            </div>
          )}

          {/* DNS Records */}
          {records.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-600 text-foreground">DNS Records to Add</p>
                <p className="text-xs text-muted-foreground">Add these in Namecheap or Cloudflare DNS settings</p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-secondary-foreground flex items-start gap-2">
                <Info size={12} className="mt-0.5 flex-shrink-0 text-primary" />
                <span>
                  Add all records below to your DNS provider (Namecheap or Cloudflare). DNS propagation takes 24–48 hours.
                  After adding, verify your domain in{' '}
                  <a href="https://app.brevo.com/senders/domain/list" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Brevo → Senders & IP → Domains
                  </a>.
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {records.map((record, i) => (
                  <div key={i} className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-600 bg-primary/10 text-primary font-mono">
                          {record.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{record.purpose}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-500 text-muted-foreground w-10 flex-shrink-0">Host</span>
                        <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
                          <code className="text-xs font-mono text-foreground flex-1 break-all">{record.host}</code>
                          <button
                            onClick={() => handleCopy(record.host, `host-${i}`)}
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copied === `host-${i}` ? <CheckCircle size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-500 text-muted-foreground w-10 flex-shrink-0">Value</span>
                        <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
                          <code className="text-xs font-mono text-foreground flex-1 break-all">{record.value}</code>
                          <button
                            onClick={() => handleCopy(record.value, `val-${i}`)}
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copied === `val-${i}` ? <CheckCircle size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Zoho note */}
              <div className="bg-warning-bg border border-warning/20 rounded-lg p-3 text-xs text-secondary-foreground flex items-start gap-2">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-warning" />
                <span>
                  For the Zoho DKIM record, get your public key from{' '}
                  <a href="https://mailadmin.zoho.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                    Zoho Mail Admin Console <ExternalLink size={10} />
                  </a>{' '}
                  → Domains → DKIM. Replace the placeholder value above with your actual key.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
