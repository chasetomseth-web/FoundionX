'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Copy, ExternalLink, TrendingUp, Users, DollarSign } from 'lucide-react';

type AffiliateData = {
  isAffiliate: boolean;
  referralCode?: string;
  referralUrl?: string;
  commissionRate?: number;
  totalEarned: number;
  totalPaid: number;
  pendingBalance: number;
  totalConversions: number;
  totalClicks: number;
  commissions: Array<{
    id: string;
    amount: number;
    status: string;
    orderTotal: number;
    createdAt: string;
  }>;
};

export default function PortalAffiliatePage() {
  const router = useRouter();
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [becomingAffiliate, setBecomingAffiliate] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetch('/api/auth/customer/affiliate')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => setData(data))
      .catch(() => router.push('/portal/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleBecomeAffiliate() {
    setBecomingAffiliate(true);
    try {
      const res = await fetch('/api/auth/customer/affiliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } finally {
      setBecomingAffiliate(false);
    }
  }

  function copyReferralLink() {
    if (data?.referralUrl) {
      navigator.clipboard.writeText(data.referralUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not an affiliate yet — show signup CTA
  if (data && !data.isAffiliate) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp size={28} className="text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Become an Affiliate</h1>
        <p className="text-muted-foreground mb-6">
          Earn commissions by sharing our products with your audience. 
          Get a unique referral link to track your sales.
        </p>
        <button
          onClick={handleBecomeAffiliate}
          disabled={becomingAffiliate}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {becomingAffiliate ? 'Joining...' : 'Join the Affiliate Program'}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please sign in to view your affiliate dashboard.</p>
        <Link href="/portal/login" className="text-primary hover:underline mt-2 inline-block">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Affiliate Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your referrals and earnings.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-lg font-bold text-foreground">${data.totalEarned.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Balance</p>
              <p className="text-lg font-bold text-foreground">${data.pendingBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversions</p>
              <p className="text-lg font-bold text-foreground">{data.totalConversions}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Clicks</p>
              <p className="text-lg font-bold text-foreground">{data.totalClicks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">Your Referral Link</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono">
            {data.referralUrl}
          </code>
          <button
            onClick={copyReferralLink}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
          >
            <Copy size={14} />
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Commission rate: <strong>{(data.commissionRate ?? 0) * 100}%</strong> | 
          Code: <strong>{data.referralCode}</strong>
        </p>
      </div>

      {/* Commission History */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Commission History</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {data.commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No commissions yet. Share your referral link to start earning!</p>
          ) : (
            <div className="divide-y divide-border">
              {data.commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">${c.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()} | Order total: ${Number(c.orderTotal).toFixed(2)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === 'paid'
                      ? 'bg-green-50 text-green-700'
                      : c.status === 'pending'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-50 text-gray-700'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}