'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useNotifications, useMarkNotificationsRead, type AppNotification } from '@/hooks/useNotifications';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

const severityIcons: Record<string, React.ReactNode> = {
  info: <Info size={14} className="text-info" />,
  success: <CheckCircle size={14} className="text-success" />,
  warning: <AlertTriangle size={14} className="text-warning" />,
  error: <XCircle size={14} className="text-danger" />,
};

const severityBg: Record<string, string> = {
  info: 'bg-info-bg',
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  error: 'bg-danger-bg',
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useNotifications();
  const { mutate: markRead } = useMarkNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Connect to SSE for real-time notification updates
  useRealtimeEvents();

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleMarkAllRead = () => {
    markRead(undefined);
  };

  const handleMarkRead = (id: string) => {
    markRead([id]);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-700 flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-600 text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-danger text-white text-[10px] font-600">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-500"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground ml-1"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={24} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={() => handleMarkRead(n.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onMarkRead,
}: {
  notification: AppNotification;
  onMarkRead: () => void;
}) {
  const isUnread = !n.readAt;
  const timeAgo = getTimeAgo(n.createdAt);

  return (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${isUnread ? 'bg-muted/10' : ''}`}
      onClick={onMarkRead}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${severityBg[n.severity] ?? 'bg-muted'}`}>
        {severityIcons[n.severity] ?? <Info size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-600 text-foreground leading-snug ${isUnread ? 'font-700' : ''}`}>
            {n.title}
          </p>
          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
