'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, CheckCircle, X, Plus } from 'lucide-react';

interface Subscription {
  plan: string;
  status: string;
  amount: number;
  interval: string;
  currentPeriodEnd: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: string;
  invoice_pdf: string;
}

export default function BillingSection() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const res = await fetch('/api/stripe/subscription');
      const data = await res.json();
      setSubscription(data.subscription || null);
      setPaymentMethods(data.paymentMethods || []);
      setBillingHistory(data.billingHistory || []);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-primary" />
        <h3 className="text-sm font-600 text-foreground">Billing & Subscription</h3>
      </div>

      {/* Current Plan */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-600 text-foreground">Current Plan</h4>
          <button
            onClick={() => setShowPlanModal(true)}
            className="text-xs text-primary hover:opacity-80 font-500"
          >
            Change Plan
          </button>
        </div>
        {subscription ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-500 text-foreground capitalize">{subscription.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-500 text-foreground">${subscription.amount}/{subscription.interval}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-500 ${subscription.status === 'active' ? 'text-success' : 'text-warning'}`}>
                {subscription.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Renews:</span>
              <span className="text-foreground">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No active subscription. {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && 'Stripe not configured.'}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-600 text-foreground">Payment Methods</h4>
          <button className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80 font-500">
            <Plus size={12} />
            Add Card
          </button>
        </div>
        <div className="border border-border rounded-lg divide-y divide-border">
          {paymentMethods.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No payment methods on file
            </div>
          ) : (
            paymentMethods.map((pm) => (
              <div key={pm.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-muted-foreground" />
                  <div className="text-sm">
                    <span className="font-500 text-foreground capitalize">{pm.brand}</span>
                    <span className="text-muted-foreground ml-1">ending in {pm.last4}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  Exp {pm.expMonth}/{pm.expYear}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Billing History */}
      <div>
        <h4 className="text-sm font-600 text-foreground mb-3">Billing History</h4>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {billingHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No billing history yet
                  </td>
                </tr>
              ) : (
                billingHistory.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-foreground">{new Date(invoice.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-foreground">${(invoice.amount / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-500 ${
                        invoice.status === 'paid' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:opacity-80 text-xs font-500"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-600 text-foreground">Choose Your Plan</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4">
              {['Starter', 'Pro', 'Enterprise'].map((plan) => (
                <div key={plan} className="border border-border rounded-lg p-4 hover:border-primary transition-colors">
                  <h4 className="font-600 text-foreground mb-2">{plan}</h4>
                  <p className="text-2xl font-700 text-foreground mb-3">
                    ${plan === 'Starter' ? '29' : plan === 'Pro' ? '99' : '299'}
                    <span className="text-sm font-400 text-muted-foreground">/mo</span>
                  </p>
                  <button className="w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90">
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}