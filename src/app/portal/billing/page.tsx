/**
 * Customer Portal — Billing
 * Redirect to Stripe Customer Portal for payment management,
 * or shows a link to manage billing info
 */
'use client';

import React, { useState } from 'react';
import { CreditCard, ExternalLink, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PortalBillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStripePortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Could not open billing portal. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-700 text-foreground">Billing & Payment Methods</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your payment methods, view invoices, and update billing information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stripe Customer Portal */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <CreditCard size={20} className="text-primary" />
          </div>
          <h2 className="text-base font-600 text-foreground mb-1">Manage Payment Methods</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Update your credit card, view billing history, and download invoices through Stripe's secure billing portal.
          </p>
          <button
            onClick={handleStripePortal}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-600 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ExternalLink size={15} />
            )}
            Open Billing Portal
          </button>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>

        {/* Invoices Summary */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <CreditCard size={20} className="text-primary" />
          </div>
          <h2 className="text-base font-600 text-foreground mb-1">Recent Invoices</h2>
          <p className="text-sm text-muted-foreground mb-4">
            View your recent invoices and payment history. For full details, visit the billing portal.
          </p>
          <Link
            href="/portal/orders"
            className="inline-flex items-center gap-2 text-sm font-600 text-primary hover:text-primary/80 transition-colors"
          >
            View Order History
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Info card */}
      <div className="mt-6 bg-muted/30 border border-border rounded-2xl p-5">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Secure billing.</strong> All payment information is securely processed
          by Stripe. We never store your full credit card details on our servers.
        </p>
      </div>
    </div>
  );
}