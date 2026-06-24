import React from 'react';
import AppLayout from '@/components/AppLayout';
import Greeting from '@/app/components/Greeting';
import OverviewBentoGrid from './components/OverviewBentoGrid';
import RecentOrdersPreview from './components/RecentOrdersPreview';
import QuickStats from './components/QuickStats';

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function OverviewPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Greeting />
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-bg text-success text-xs font-600 border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Store Live
            </span>
          </div>
        </div>
        <OverviewBentoGrid />
        <QuickStats />
        <RecentOrdersPreview />
      </div>
    </AppLayout>
  );
}
