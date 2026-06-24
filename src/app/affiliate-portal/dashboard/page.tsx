/**
 * Affiliate Portal — Dashboard
 * Shows affiliate stats, earnings, referral link, and performance
 */
'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  DollarSign,
  Users,
  MousePointerClick,
  Copy,
  Check,
  Loader2,
  TrendingUp,
  Link2,
} from 'lucide-react';
import { useAffiliates } from '@/hooks/useAffiliates';

export default function AffiliateDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStats();
    // Build referral link from current domain
    const base = window.location.origin;
    const ref = new URLSearchParams(window.location.search).get('ref') || '';
    setReferralLink(`${base}?ref=${ref || 'YOUR_CODE'}`);
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/customer/affiliate');
      const json = await res.json();
      // Map to expected stats shape
      setStats({
        totalEarned: json.totalEarned ?? 0,
        totalPaid: json.totalPaid ?? 0,
        pendingBalance: json.pendingBalance ?? 0,
        totalConversions: json.totalConversions ?? 0,
        totalClicks: json.totalClicks ?? 0,
        referralCode: json.referralCode ?? '',
        referralUrl: json.referralUrl ?? '',
        commissions: json.commissions ?? [],
      });
      if (json.referralCode) {
        setReferralLink(json.referralUrl ?? `${window.location.origin}/?ref=${json.referralCode}`);
      }
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statCards = [
    { label: 'Total Earned', value: stats?.totalEarned ?? 0, icon: DollarSign, prefix: '$' },
    { label: 'Pending Balance', value: stats?.pendingBalance ?? 0, icon: TrendingUp, prefix: '$' },
    { label: 'Total Referrals', value: stats?.totalReferrals ?? 0, icon: Users },
    { label: 'Conversions', value: stats?.totalConversions ?? 0, icon: MousePointerClick },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-700 text-foreground">Affiliate Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your earnings, referrals, and performance</p>
      </div>

      {/* Referral Link */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={15} className="text-primary" />
          <span className="text-sm font-600 text-foreground">Your Referral Link</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-lg border border-border text-muted-foreground truncate">
            {referralLink}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-500 hover:bg-primary/90 transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon size={16} className="text-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-700 text-foreground">
                    {card.prefix || ''}{Number(card.value).toLocaleString('en-US', { minimumFractionDigits: card.prefix ? 2 : 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </div>
              );
            })}
          </div>

          {/* Performance section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-base font-600 text-foreground mb-4">Performance Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Commission Rate</p>
                <p className="text-lg font-700 text-foreground">
                  {stats?.commissionRate ? `${(Number(stats.commissionRate) * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
                <p className="text-lg font-700 text-foreground">
                  {stats?.totalReferrals && stats.totalReferrals > 0
                    ? `${((stats.totalConversions / stats.totalReferrals) * 100).toFixed(1)}%`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}