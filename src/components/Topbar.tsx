'use client';

import React from 'react';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';

export default function Topbar() {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 gap-4 flex-shrink-0">
      {/* Global Search */}
      <GlobalSearch />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <NotificationCenter />
        <div className="w-8 h-8 rounded-full bg-foreground text-background text-xs font-600 flex items-center justify-center ml-1">
          M
        </div>
      </div>
    </header>
  );
}