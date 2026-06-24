'use client';

import React from 'react';
import { Activity, Mail, Eye, LogIn, LogOut, ShoppingCart } from 'lucide-react';
import { useActivityFeed } from '../hooks/useRetentionData';
import { formatTimestamp } from '@/lib/retention-mock-data';
import type { ActivityFeedItem } from '@/lib/retention-types';

function ActivityIcon({ type }: { type: ActivityFeedItem['type'] }) {
  const icons: Record<string, React.ReactNode> = {
    session_start: <LogIn size={14} className="text-primary" />,
    page_view: <Eye size={14} className="text-muted-foreground" />,
    email_captured: <Mail size={14} className="text-success" />,
    checkout_started: <ShoppingCart size={14} className="text-warning" />,
    purchase: <ShoppingCart size={14} className="text-success" />,
    session_end: <LogOut size={14} className="text-danger" />,
  };

  return (
    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
      {icons[type] ?? <Activity size={14} className="text-muted-foreground" />}
    </div>
  );
}

export default function VisitorActivityFeed() {
  const { data, isLoading } = useActivityFeed(25);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-600 text-foreground">Visitor Activity Feed</h3>
        <Activity size={14} className="text-muted-foreground" />
      </div>

      <div className="p-2 max-h-[520px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.data.length > 0 ? (
          <div className="space-y-0.5">
            {data.data.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ActivityIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(item.timestamp)}
                    </span>
                    {item.visitorEmail && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {item.visitorEmail}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No recent activity.
          </div>
        )}
      </div>
    </div>
  );
}