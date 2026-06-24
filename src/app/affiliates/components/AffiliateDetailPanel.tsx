'use client';

import React, { useState } from 'react';
import { type Affiliate } from './affiliatesData';
import { X, Repeat2, ExternalLink, Copy, Mail, Wallet, Link2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';


interface Props {
  affiliate: Affiliate;
  onClose: () => void;
}

const tierColors: Record<string, string> = {
  standard: 'bg-muted text-muted-foreground',
  silver: 'bg-muted text-secondary-foreground',
  gold: 'bg-warning-bg text-warning',
  platinum: 'bg-primary/10 text-primary',
};

export default function AffiliateDetailPanel({ affiliate, onClose }: Props) {
  const joined = new Date(affiliate.joinedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lastConv = affiliate.lastConversionDate
    ? new Date(affiliate.lastConversionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/?ref=${encodeURIComponent(affiliate.code)}`;

  async function copyReferralLink() {
    await navigator.clipboard.writeText(referralUrl);
    toast.success('Referral link copied');
  }

  async function handleProcessPayout() {
    // No dedicated payout endpoint found in repo; queue a UI action.
    setIsSubmitting(true);
    try {
      toast.message('Payout processing queued', {
        description: 'This UI action is a stub. Implement a backend endpoint to trigger GoAffPro payout.',
      });
      setPayoutModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendEmail() {
    setIsSubmitting(true);
    try {
      // Try to trigger a generic email automation if available; otherwise UI stub.
      const res = await fetch('/api/email/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'affiliate.message',
          email: affiliate.email,
          props: { subject: emailSubject, body: emailBody, referralCode: affiliate.code },
        }),
      });

      if (!res.ok) {
        toast.error('Failed to send email (automation trigger)');
        return;
      }

      toast.success('Email queued');
      setEmailModalOpen(false);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (

    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto slide-in-right scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-600 text-sm">
              {affiliate.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 className="font-600 text-foreground">{affiliate.name}</h2>
              <p className="text-xs text-muted-foreground">{affiliate.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Status + Tier */}
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-500 ${affiliate.status === 'active' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{affiliate.status}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-500 capitalize ${tierColors[affiliate.tier]}`}>{affiliate.tier}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-500 bg-muted text-muted-foreground">{affiliate.commissionRate}% commission</span>
            {affiliate.recurringCommissions && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-500 bg-primary/10 text-primary">
                <Repeat2 size={10} />Recurring
              </span>
            )}
          </div>

          {/* Affiliate Link */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Referral Code</p>
            <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
              <code className="flex-1 text-sm font-mono text-foreground">{affiliate.code}</code>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Copy code">
                <Copy size={13} />
              </button>
            </div>
          </div>

          {/* Performance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Clicks</p>
              <p className="text-xl font-600 text-foreground">{affiliate.clicks.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Conversions</p>
              <p className="text-xl font-600 text-foreground">{affiliate.conversions}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Conv. Rate</p>
              <p className="text-xl font-600 text-foreground">{affiliate.conversionRate.toFixed(2)}%</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">GMV</p>
              <p className="text-xl font-600 text-foreground">${affiliate.gmv.toLocaleString()}</p>
            </div>
          </div>

          {/* Payouts */}
          <div className="bg-muted/40 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Payouts</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-foreground">Total Earned</span>
              <span className="font-600 text-foreground">${affiliate.commission.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-foreground">Total Paid</span>
              <span className="font-500 text-foreground">${affiliate.totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-600 text-foreground">Pending Payout</span>
              <span className={`font-600 text-lg ${affiliate.pendingPayout > 0 ? 'text-warning' : 'text-muted-foreground'}`}>${affiliate.pendingPayout.toLocaleString()}</span>
            </div>
            {affiliate.paypalEmail && (
              <p className="text-xs text-muted-foreground">PayPal: {affiliate.paypalEmail}</p>
            )}
          </div>

          {/* GoAffPro */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">GoAffPro</p>
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
              <span className="text-xs font-mono text-secondary-foreground">{affiliate.goaffproId}</span>
              <button className="text-xs text-primary hover:opacity-80 transition-opacity flex items-center gap-1">
                View <ExternalLink size={10} />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Timeline</p>
            <div className="flex flex-col gap-1.5 text-xs text-secondary-foreground">
              <div className="flex items-center justify-between">
                <span>Joined</span>
                <span className="text-foreground font-500">{joined}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Conversion</span>
                <span className="text-foreground font-500">{lastConv}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setPayoutModalOpen(true)}
              className="flex-1 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity"
              type="button"
            >
              Process Payout
            </button>
            <button
              onClick={() => {
                setEmailSubject(`Commission / payout update for ${affiliate.name}`);
                setEmailBody(`Hi ${affiliate.name},\n\nJust checking in regarding your affiliate earnings and next payout. Your referral code is ${affiliate.code}.\n\nThanks,\n`);
                setEmailModalOpen(true);
              }}
              className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground"
              type="button"
            >
              Send Email
            </button>
          </div>

        </div>

        {/* Modals */}

      </div>


      <Modal open={payoutModalOpen} onClose={() => setPayoutModalOpen(false)} title="Process Payout" size="sm">

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            This action is currently a UI stub (no dedicated payout endpoint in the repo).
          </p>
          <div className="bg-muted/40 rounded-xl p-3 text-xs text-secondary-foreground">
            Affiliate: <span className="font-600 text-foreground">{affiliate.name}</span>
            <br />
            Pending payout: <span className="font-600 text-foreground">${affiliate.pendingPayout.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              type="button"
              onClick={() => void handleProcessPayout()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing…' : 'Confirm'}
            </button>
            <button
              className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors"
              type="button"
              onClick={() => setPayoutModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Send Affiliate Email" size="lg">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendEmail();
          }}
        >
          <div className="bg-muted/40 rounded-xl p-3 text-xs text-secondary-foreground">
            To: <span className="font-600 text-foreground">{affiliate.email}</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-600 text-muted-foreground">Subject</label>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-600 text-muted-foreground">Message</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="min-h-28 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none resize-y"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending…' : 'Send'}
            </button>
            <button
              className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors"
              type="button"
              onClick={() => setEmailModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

