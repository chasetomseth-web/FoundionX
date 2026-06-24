'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  readAt: string | null;
  actionUrl: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

async function fetchNotifications(unreadOnly = false): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set('unread', 'true');
  const res = await fetch(`/api/notifications?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

async function markRead(ids?: string[]): Promise<void> {
  const res = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids ? { ids } : { markAll: true }),
  });
  if (!res.ok) throw new Error('Failed to mark notifications as read');
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30 * 1000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => markRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
