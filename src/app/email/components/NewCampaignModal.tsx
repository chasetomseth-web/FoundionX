'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, AlertCircle, CheckCircle, ChevronDown, Info, Users, Mail, List } from 'lucide-react';

interface Sender {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

interface ContactList {
  id: number;
  name: string;
  uniqueSubscribers: number;
  totalSubscribers: number;
}

type RecipientMode = 'list' | 'manual';

interface NewCampaignModalProps {
  onClose: () => void;
  onSent: () => void;
}

export default function NewCampaignModal({ onClose, onSent }: NewCampaignModalProps) {
  const [step, setStep] = useState<'compose' | 'sending' | 'done' | 'error'>('compose');
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(true);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('list');
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [manualEmails, setManualEmails] = useState('');
  const [emailInputError, setEmailInputError] = useState('');
  const manualInputRef = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState({
    name: '',
    subject: '',
    senderName: '',
    senderEmail: '',
    htmlContent: '',
    scheduledAt: '',
  });
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ campaignId?: number; status?: string } | null>(null);

  useEffect(() => {
    fetch('/api/email/sender-domains')
      .then((r) => r.json())
      .then((data) => {
        setSenders(data.senders ?? []);
        if (data.senders?.length > 0) {
          const first = data.senders[0];
          setForm((f) => ({ ...f, senderName: first.name, senderEmail: first.email }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSenders(false));

    fetch('/api/email/contact-lists')
      .then((r) => r.json())
      .then((data) => {
        setContactLists(data.lists ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingLists(false));
  }, []);

  const toggleList = (id: number) => {
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const validateManualEmails = (value: string): string[] => {
    if (!value.trim()) return [];
    return value
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
  };

  const handleSend = async () => {
    setEmailInputError('');

    if (!form.name || !form.subject || !form.senderEmail || !form.htmlContent) {
      setError('Campaign name, subject, sender email, and email body are required.');
      return;
    }

    // Validate recipients
    if (recipientMode === 'list' && selectedListIds.length === 0) {
      setError('Please select at least one contact list.');
      return;
    }

    let parsedEmails: string[] = [];
    if (recipientMode === 'manual') {
      parsedEmails = validateManualEmails(manualEmails);
      if (parsedEmails.length === 0) {
        setError('Please enter at least one recipient email address.');
        return;
      }
      // Basic email format check
      const invalid = parsedEmails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (invalid.length > 0) {
        setError(`Invalid email address(es): ${invalid.slice(0, 3).join(', ')}`);
        return;
      }
    }

    setError('');
    setStep('sending');

    try {
      const res = await fetch('/api/email/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          senderName: form.senderName,
          senderEmail: form.senderEmail,
          htmlContent: form.htmlContent,
          scheduledAt: form.scheduledAt || undefined,
          recipientListIds: recipientMode === 'list' ? selectedListIds : [],
          recipientEmails: recipientMode === 'manual' ? parsedEmails : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to send campaign');
        setStep('error');
        return;
      }

      setResult(data);
      setStep('done');
    } catch {
      setError('Network error. Please try again.');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="font-600 text-foreground">New Email Campaign</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sent via Brevo from your business email</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {step === 'done' ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center">
                <CheckCircle size={28} className="text-success" />
              </div>
              <div>
                <p className="font-600 text-foreground text-lg">Campaign {result?.status === 'scheduled' ? 'Scheduled' : 'Sent'}!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result?.status === 'scheduled' ?'Your campaign has been scheduled in Brevo.' :'Your campaign is being delivered via Brevo.'}
                </p>
                {result?.campaignId && (
                  <p className="text-xs text-muted-foreground mt-1">Campaign ID: {result.campaignId}</p>
                )}
              </div>
              <button onClick={onSent} className="px-6 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
                Done
              </button>
            </div>
          ) : step === 'sending' ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Sending campaign via Brevo…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 bg-danger-bg border border-danger/20 rounded-lg px-3 py-2.5 text-xs text-danger">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Recipients */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-600 text-foreground flex items-center gap-1.5">
                  <Users size={12} />
                  Recipients <span className="text-danger">*</span>
                </label>

                {/* Mode Toggle */}
                <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-500 transition-colors ${
                      recipientMode === 'list' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <List size={11} />
                    Contact List
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('manual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-500 transition-colors ${
                      recipientMode === 'manual' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Mail size={11} />
                    Enter Emails
                  </button>
                </div>

                {/* Contact List Selection */}
                {recipientMode === 'list' && (
                  <div className="flex flex-col gap-1.5">
                    {loadingLists ? (
                      <div className="h-20 rounded-lg border border-border bg-muted animate-pulse" />
                    ) : contactLists.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-3 rounded-lg border border-border bg-muted/50 text-xs text-muted-foreground">
                        <Info size={12} className="flex-shrink-0" />
                        No contact lists found in Brevo. Create a list in Brevo first, or use "Enter Emails" to send to specific addresses.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto rounded-lg border border-border p-2">
                        {contactLists.map((list) => (
                          <label
                            key={list.id}
                            className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedListIds.includes(list.id)}
                              onChange={() => toggleList(list.id)}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                            />
                            <span className="text-sm text-foreground flex-1">{list.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {list.uniqueSubscribers ?? list.totalSubscribers} contacts
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    {selectedListIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedListIds.length} list{selectedListIds.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}

                {/* Manual Email Entry */}
                {recipientMode === 'manual' && (
                  <div className="flex flex-col gap-1.5">
                    <textarea
                      ref={manualInputRef}
                      rows={3}
                      placeholder="Enter email addresses separated by commas, semicolons, or new lines&#10;e.g. alice@example.com, bob@example.com"
                      value={manualEmails}
                      onChange={(e) => {
                        setManualEmails(e.target.value);
                        setEmailInputError('');
                      }}
                      className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
                    />
                    {emailInputError && (
                      <p className="text-xs text-danger">{emailInputError}</p>
                    )}
                    {manualEmails.trim() && (
                      <p className="text-xs text-muted-foreground">
                        {validateManualEmails(manualEmails).length} recipient(s) entered
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info size={10} />
                      Brevo will create a temporary list for these addresses. Each address must be a valid Brevo contact.
                    </p>
                  </div>
                )}
              </div>

              {/* Campaign Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-600 text-foreground">Campaign Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. June Newsletter"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-600 text-foreground">Subject Line <span className="text-danger">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 🔥 Exclusive offer just for you"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Sender */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-600 text-foreground">Sender Name</label>
                  <input
                    type="text"
                    placeholder="Your Business Name"
                    value={form.senderName}
                    onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                    className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-600 text-foreground">Sender Email <span className="text-danger">*</span></label>
                  {loadingSenders ? (
                    <div className="h-9 rounded-lg border border-border bg-muted animate-pulse" />
                  ) : senders.length > 0 ? (
                    <div className="relative">
                      <select
                        value={form.senderEmail}
                        onChange={(e) => {
                          const s = senders.find((x) => x.email === e.target.value);
                          setForm((f) => ({ ...f, senderEmail: e.target.value, senderName: s?.name ?? f.senderName }));
                        }}
                        className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary appearance-none cursor-pointer"
                      >
                        {senders.map((s) => (
                          <option key={s.id} value={s.email}>{s.email}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="email"
                      placeholder="hello@yourbusiness.com"
                      value={form.senderEmail}
                      onChange={(e) => setForm((f) => ({ ...f, senderEmail: e.target.value }))}
                      className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                    />
                  )}
                </div>
              </div>

              {/* Email Body */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-600 text-foreground">Email Body (HTML) <span className="text-danger">*</span></label>
                <textarea
                  rows={10}
                  placeholder="<p>Hello {{contact.FIRSTNAME}},</p><p>Your message here...</p>"
                  value={form.htmlContent}
                  onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-y font-mono text-xs leading-relaxed"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info size={10} /> Use Brevo template variables like {'{{contact.FIRSTNAME}}'} for personalization.
                </p>
              </div>

              {/* Schedule */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-600 text-foreground">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
                <p className="text-xs text-muted-foreground">Leave empty to send immediately.</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === 'compose' || step === 'error' ? (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-2 px-5 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Send size={13} />
              {form.scheduledAt ? 'Schedule Campaign' : 'Send Now'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
