'use client';

import { QueryClient } from '@tanstack/react-query';

let queryClientInstance: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create new instance
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: 1,
        },
      },
    });
  }

  // Browser: reuse singleton
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000, // 30 seconds
          gcTime: 5 * 60 * 1000, // 5 minutes
          retry: 2,
          retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
        },
        mutations: {
          retry: 1,
        },
      },
    });
  }

  return queryClientInstance;
}
