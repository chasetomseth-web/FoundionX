/**
 * Affiliate Portal — Commissions History
 * Shows all commissions earned by this affiliate
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2, ChevronRight } from 'lucide-react';

interface Commission {
  id: string;
  amount: number;
  rate: number;
  orderTotal: number;
  status: string;
  type: string;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AffiliateCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCommissions();
  }, []);

  async function fetchCommissions() {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliates/me/commissions?limit=100');
      const json = await res.json();
      setCommissions(json.commissions ?? []);
    } catch {
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'all' ? commissions : commissions.filter((c) => c.status === filter);

  const totalEarned = commissions
    .filter((c) => c.status === 'approved' || c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const pendingTotal = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-700 text-foreground">Commissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your earned commissions</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
          <p className="text-2xl font-700 text-foreground">${totalEarned.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-700 text-foreground">${pendingTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        {['all', 'pending', 'approved', 'paid'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-500 rounded-lg capitalize transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground bg-muted/30'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <DollarSign size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No commissions found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-600 text-foreground">
                    ${Number(c.amount).toFixed(2)} @ {(Number(c.rate) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString()} &middot; Order: ${Number(c.orderTotal).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-500 px-2 py-0.5 rounded-full ${
                    STATUS_COLORS[c.status] || 'bg-muted text-muted-foreground'
                  }`}
                >
                  {c.status}
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