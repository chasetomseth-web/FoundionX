/**
 * Affiliate Portal — Payouts
 * Shows payout history and allows requesting payout
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2, ChevronRight, Send } from 'lucide-react';

interface Payout {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  processedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

export default function AffiliatePayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliates/me/payouts?limit=50');
      const json = await res.json();
      setPayouts(json.payouts ?? []);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPayout() {
    if (!confirm('Request a payout for your pending balance?')) return;
    setRequesting(true);
    setRequestError(null);
    setRequestSuccess(false);
    try {
      const res = await fetch('/api/affiliates/me/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'paypal' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to request payout');
      setRequestSuccess(true);
      fetchPayouts();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRequesting(false);
    }
  }

  const totalPaid = payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-700 text-foreground">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-1">Request and track your payouts</p>
        </div>
        <button
          onClick={handleRequestPayout}
          disabled={requesting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-600 hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {requesting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Request Payout
        </button>
      </div>

      {requestSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          Payout requested successfully! It will be processed within 3-5 business days.
        </div>
      )}
      {requestError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {requestError}
        </div>
      )}

      {/* Summary */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <p className="text-xs text-muted-foreground mb-1">Total Paid Out</p>
        <p className="text-2xl font-700 text-foreground">${totalPaid.toFixed(2)}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-20">
          <DollarSign size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No payouts yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {payouts.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-600 text-foreground">${Number(p.amount).toFixed(2)} via {p.method}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                    {p.processedAt ? ` · Processed ${new Date(p.processedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-500 px-2 py-0.5 rounded-full ${
                    STATUS_COLORS[p.status] || 'bg-muted text-muted-foreground'
                  }`}
                >
                  {p.status}
                </span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}