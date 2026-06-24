'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  RetentionOverview,
  VisitorListItem,
  Visitor,
  ActivityFeedItem,
  PaginatedResponse,
} from '@/lib/retention-types';

const BASE = '/api/v1/retention';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return res.json();
}

export function useRetentionOverview() {
  return useQuery<RetentionOverview>({
    queryKey: ['retention', 'overview'],
    queryFn: () => fetchJSON<RetentionOverview>(`${BASE}/overview`),
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
}

export function useVisitors(page = 1, limit = 20) {
  return useQuery<PaginatedResponse<VisitorListItem>>({
    queryKey: ['retention', 'visitors', page, limit],
    queryFn: () =>
      fetchJSON<PaginatedResponse<VisitorListItem>>(
        `${BASE}/visitors?page=${page}&limit=${limit}`
      ),
    refetchInterval: 15 * 1000,
    staleTime: 10 * 1000,
  });
}

export function useVisitorById(id: string | null) {
  return useQuery<Visitor>({
    queryKey: ['retention', 'visitor', id],
    queryFn: () => fetchJSON<Visitor>(`${BASE}/visitor/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useActivityFeed(limit = 25) {
  return useQuery<{ data: ActivityFeedItem[]; total: number }>({
    queryKey: ['retention', 'activity-feed', limit],
    queryFn: () =>
      fetchJSON<{ data: ActivityFeedItem[]; total: number }>(
        `${BASE}/visitors?feed=true&limit=${limit}`
      ),
    refetchInterval: 15 * 1000,
    staleTime: 10 * 1000,
  });
}