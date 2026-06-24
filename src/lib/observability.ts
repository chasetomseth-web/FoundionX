/**
 * Observability Layer
 * Structured logging with correlation IDs, per-tenant context, and webhook/queue metrics
 */

// ============================================================
// STRUCTURED LOGGER
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  organizationId?: string;
  source?: string;
  eventType?: string;
  eventId?: string;
  webhookId?: string;
  jobId?: string;
  queue?: string;
  userId?: string;
  route?: string;
  durationMs?: number;
  attempts?: number;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context: LogContext = {}): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
}

function log(level: LogLevel, message: string, context: LogContext = {}): void {
  const formatted = formatLog(level, message, context);
  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

// ============================================================
// DOMAIN-SPECIFIC LOGGERS
// ============================================================

export const webhookLogger = {
  info: (message: string, ctx: LogContext = {}) => log('info', `[WEBHOOK] ${message}`, ctx),
  warn: (message: string, ctx: LogContext = {}) => log('warn', `[WEBHOOK] ${message}`, ctx),
  error: (message: string, ctx: LogContext = {}) => log('error', `[WEBHOOK] ${message}`, ctx),
  debug: (message: string, ctx: LogContext = {}) => log('debug', `[WEBHOOK] ${message}`, ctx),
};

export const queueLogger = {
  info: (message: string, ctx: LogContext = {}) => log('info', `[QUEUE] ${message}`, ctx),
  warn: (message: string, ctx: LogContext = {}) => log('warn', `[QUEUE] ${message}`, ctx),
  error: (message: string, ctx: LogContext = {}) => log('error', `[QUEUE] ${message}`, ctx),
  debug: (message: string, ctx: LogContext = {}) => log('debug', `[QUEUE] ${message}`, ctx),
};

export const cacheLogger = {
  info: (message: string, ctx: LogContext = {}) => log('info', `[CACHE] ${message}`, ctx),
  warn: (message: string, ctx: LogContext = {}) => log('warn', `[CACHE] ${message}`, ctx),
  error: (message: string, ctx: LogContext = {}) => log('error', `[CACHE] ${message}`, ctx),
};

export const reconcileLogger = {
  info: (message: string, ctx: LogContext = {}) => log('info', `[RECONCILE] ${message}`, ctx),
  warn: (message: string, ctx: LogContext = {}) => log('warn', `[RECONCILE] ${message}`, ctx),
  error: (message: string, ctx: LogContext = {}) => log('error', `[RECONCILE] ${message}`, ctx),
};

export const apiLogger = {
  info: (message: string, ctx: LogContext = {}) => log('info', `[API] ${message}`, ctx),
  warn: (message: string, ctx: LogContext = {}) => log('warn', `[API] ${message}`, ctx),
  error: (message: string, ctx: LogContext = {}) => log('error', `[API] ${message}`, ctx),
};

// ============================================================
// CORRELATION ID MIDDLEWARE HELPER
// ============================================================

import { NextRequest } from 'next/server';
import crypto from 'crypto';

export function getCorrelationId(req: NextRequest): string {
  return (
    req.headers.get('x-correlation-id') ??
    req.headers.get('x-request-id') ??
    crypto.randomUUID()
  );
}

// ============================================================
// PERFORMANCE TIMER
// ============================================================

export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

// ============================================================
// WEBHOOK METRICS SNAPSHOT
// ============================================================

export interface WebhookMetrics {
  source: string;
  successRate: number;
  failureCount: number;
  dlqCount: number;
  avgLatencyMs: number;
  retryCount: number;
}

export function buildWebhookMetricsSummary(
  stats: Record<string, { processed: number; failed: number; deadLettered: number; pending: number }>,
  avgProcessingMs: number
): WebhookMetrics[] {
  return Object.entries(stats).map(([source, counts]) => {
    const total = counts.processed + counts.failed + counts.deadLettered;
    return {
      source,
      successRate: total > 0 ? Math.round((counts.processed / total) * 10000) / 100 : 100,
      failureCount: counts.failed,
      dlqCount: counts.deadLettered,
      avgLatencyMs: avgProcessingMs,
      retryCount: counts.failed,
    };
  });
}
