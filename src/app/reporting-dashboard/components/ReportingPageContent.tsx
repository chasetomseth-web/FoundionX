'use client';

import React, { useState, useCallback } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import ReportingKPIRow from './ReportingKPIRow';
import GmvChart from './GmvChart';
import ProductCategoryChart from './ProductCategoryChart';
import ConversionChart from './ConversionChart';
import SubscriptionHealthChart from './SubscriptionHealthChart';
import AffiliateLeaderboard from './AffiliateLeaderboard';
import EmailCampaignMetrics from './EmailCampaignMetrics';
import ReportingDateFilter from './ReportingDateFilter';
import AffiliateAnalyticsPanel from './AffiliateAnalyticsPanel';
import { Download, RefreshCw, BarChart3, Link2 } from 'lucide-react';
import BackButton from '@/components/ui/back-button';

type Tab = 'overview' | 'affiliates';

export default function ReportingPageContent() {
  const [tab, setTab] = useState<Tab>('overview');
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);

  const { data, isLoading, isFetching, refetch } = useAnalytics(dateFrom, dateTo);

  const revenueByDay = data?.revenueByDay ?? [];
  const topProducts = data?.topProducts ?? [];
  const kpis = data?.kpis;
  const subscriptionBreakdown = data?.subscriptionBreakdown ?? [];

  const handleDateChange = useCallback((from?: string, to?: string) => {
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
    { id: 'affiliates' as Tab, label: 'Affiliate Analytics', icon: Link2 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Reporting</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            Revenue intelligence · Stripe · Affiliates · Brevo
            {isFetching && !isLoading && <RefreshCw size={10} className="animate-spin text-primary" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReportingDateFilter onChange={handleDateChange} />
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm font-500 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-sm font-600 hover:bg-foreground/90 active:scale-[0.98] transition-all">
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-500 transition-all ${
              tab === id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          <ReportingKPIRow kpis={kpis} isLoading={isLoading} />
          <GmvChart data={revenueByDay} isLoading={isLoading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-4">
            <ProductCategoryChart data={topProducts} isLoading={isLoading} />
            <ConversionChart from={dateFrom} to={dateTo} />
          </div>

          <SubscriptionHealthChart data={subscriptionBreakdown} isLoading={isLoading} />
          <AffiliateLeaderboard />
          <EmailCampaignMetrics />

          <div className="flex items-start gap-3 p-4 rounded-xl border border-info/20 bg-info-bg">
            <div className="w-5 h-5 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-info text-[10px] font-700">i</span>
            </div>
            <div>
              <p className="text-sm font-600 text-foreground">Stripe reconciliation status</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live data from PostgreSQL via Prisma · Stripe webhook-synced ·{' '}
                <span className="text-primary font-500 cursor-pointer hover:underline">
                  View in Stripe Dashboard →
                </span>
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── AFFILIATE ANALYTICS TAB ── */}
      {tab === 'affiliates' && <AffiliateAnalyticsPanel from={dateFrom} to={dateTo} />}
    </div>
  );
}

