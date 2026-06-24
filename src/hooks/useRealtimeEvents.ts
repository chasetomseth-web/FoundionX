'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type SSEEvent = {
  type: 'new_orders' | 'webhook_events' | 'failed_payments' | 'heartbeat' | 'connected';
  data: { count?: number; timestamp: string };
};

export function useRealtimeEvents(onEvent?: (event: SSEEvent) => void) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource('/api/events/stream');
    esRef.current = es;

    es.addEventListener('connected', () => {
      console.log('[SSE] Connected to event stream');
    });

    es.addEventListener('new_orders', (e) => {
      const data = JSON.parse(e.data);
      // Invalidate orders queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      onEvent?.({ type: 'new_orders', data });
    });

    es.addEventListener('failed_payments', (e) => {
      const data = JSON.parse(e.data);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-kpis'] });
      onEvent?.({ type: 'failed_payments', data });
    });

    es.addEventListener('webhook_events', (e) => {
      const data = JSON.parse(e.data);
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      onEvent?.({ type: 'webhook_events', data });
    });

    es.addEventListener('heartbeat', (e) => {
      const data = JSON.parse(e.data);
      onEvent?.({ type: 'heartbeat', data });
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Reconnect after 5 seconds
      reconnectTimerRef.current = setTimeout(connect, 5000);
    };
  }, [queryClient, onEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);
}
