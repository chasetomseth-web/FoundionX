/**
 * Affiliate Portal — Referrals
 * Shows referred customers and their conversion status
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Users, Loader2, ExternalLink } from 'lucide-react';

interface Referral {
  id: string;
  type: string;
  referralUrl: string | null;
  convertedAt: string | null;
  createdAt: string;
}

export default function AffiliateReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferrals();
  }, []);

  async function fetchReferrals() {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliates/me/referrals?limit=100');
      const json = await res.json();
      setReferrals(json.referrals ?? []);
    } catch {
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }

  const totalClicks = referrals.filter((r) => r.type === 'click').length;
  const totalConversions = referrals.filter((r) => r.convertedAt).length;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-700 text-foreground">Referrals</h1>
        <p className="text-sm text-muted-foreground mt-1">Track who you've referred and their conversion status</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
          <p className="text-2xl font-700 text-foreground">{totalClicks}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Conversions</p>
          <p className="text-2xl font-700 text-foreground">{totalConversions}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
          <p className="text-2xl font-700 text-foreground">{conversionRate}%</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-20">
          <Users size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No referral activity yet. Share your link to start earning!</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-500 text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-500 text-muted-foreground">Referral URL</th>
                  <th className="text-left px-4 py-3 font-500 text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-500 text-muted-foreground">Converted</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 capitalize text-foreground">{r.type}</td>
                    <td className="px-4 py-3">
                      {r.referralUrl ? (
                        <a
                          href={r.referralUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {r.referralUrl.length > 30
                            ? r.referralUrl.substring(0, 30) + '…'
                            : r.referralUrl}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.convertedAt ? (
                        <span className="text-xs font-500 px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          {new Date(r.convertedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}