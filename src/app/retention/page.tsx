'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import RetentionOverviewCards from './components/RetentionOverviewCards';
import VisitorTable from './components/VisitorTable';
import VisitorActivityFeed from './components/VisitorActivityFeed';
import SessionDetailDrawer from './components/SessionDetailDrawer';

export default function RetentionDashboardPage() {
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-800 text-foreground tracking-tight">Retention</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visitor tracking, session analytics, and email identity linking
            </p>
          </div>
        </div>

        {/* Overview Cards */}
        <RetentionOverviewCards />

        {/* Main Content: Table + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Visitor Table */}
          <div className="lg:col-span-3">
            <VisitorTable
              onSelectVisitor={setSelectedVisitorId}
              selectedVisitorId={selectedVisitorId}
            />
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <VisitorActivityFeed />
          </div>
        </div>
      </div>

      {/* Session Detail Drawer */}
      <SessionDetailDrawer
        visitorId={selectedVisitorId}
        onClose={() => setSelectedVisitorId(null)}
      />
    </AppLayout>
  );
}