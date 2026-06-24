/**
 * MerchantOS — Prisma Query Performance Middleware
 * Slow query detection (>200ms), N+1 auditing, large payload detection,
 * query trace tagging per request, and connection optimization.
 */

import { Prisma, PrismaClient } from '@prisma/client';

// ============================================================
// CONFIGURATION
// ============================================================

const SLOW_QUERY_THRESHOLD_MS = 200;
const LARGE_PAYLOAD_ROWS = 500;
const N1_DETECTION_WINDOW_MS = 100;
const N1_DETECTION_THRESHOLD = 5; // same model queried N+ times in window

// ============================================================
// QUERY TRACE STORE (per-request context)
// ============================================================

interface QueryTrace {
  model: string;
  action: string;
  durationMs: number;
  timestamp: number;
  correlationId?: string;
  tenantId?: string;
  args?: unknown;
}

// In-memory ring buffer for N+1 detection (last 1000 queries)
const queryTraceBuffer: QueryTrace[] = [];
const MAX_TRACE_BUFFER = 1000;

function recordTrace(trace: QueryTrace): void {
  if (queryTraceBuffer.length >= MAX_TRACE_BUFFER) {
    queryTraceBuffer.shift();
  }
  queryTraceBuffer.push(trace);
}

// ============================================================
// N+1 DETECTION
// ============================================================

function detectN1Pattern(model: string, action: string): boolean {
  const now = Date.now();
  const windowStart = now - N1_DETECTION_WINDOW_MS;

  const recentSameQueries = queryTraceBuffer.filter(
    (t) =>
      t.model === model &&
      t.action === action &&
      t.timestamp >= windowStart
  );

  return recentSameQueries.length >= N1_DETECTION_THRESHOLD;
}

// ============================================================
// QUERY PERFORMANCE MIDDLEWARE
// ============================================================

export function createQueryPerformanceMiddleware(
  correlationId?: string,
  tenantId?: string
): Prisma.Middleware {
  return async (params, next) => {
    const start = Date.now();
    const model = params.model ?? 'Unknown';
    const action = params.action;

    // N+1 detection — warn before executing
    if (detectN1Pattern(model, action)) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: '[DB] Potential N+1 query detected',
          model,
          action,
          correlationId,
          tenantId,
          suggestion: `Consider using include/select or batching for ${model}.${action}`,
        })
      );
    }

    let result: unknown;
    let error: unknown;

    try {
      result = await next(params);
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const durationMs = Date.now() - start;

      const trace: QueryTrace = {
        model,
        action,
        durationMs,
        timestamp: Date.now(),
        correlationId,
        tenantId,
      };

      recordTrace(trace);

      // Slow query detection
      if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: '[DB] Slow query detected',
            model,
            action,
            durationMs,
            threshold: SLOW_QUERY_THRESHOLD_MS,
            correlationId,
            tenantId,
            args: process.env.NODE_ENV === 'development' ? params.args : undefined,
          })
        );
      }

      // Large payload detection
      if (result && Array.isArray(result) && result.length > LARGE_PAYLOAD_ROWS) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: '[DB] Large payload detected — consider pagination',
            model,
            action,
            rowCount: result.length,
            threshold: LARGE_PAYLOAD_ROWS,
            correlationId,
            tenantId,
          })
        );
      }

      // Standard query log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(
          JSON.stringify({
            level: 'debug',
            message: '[DB] Query executed',
            model,
            action,
            durationMs,
            correlationId,
          })
        );
      }

      // Error logging
      if (error) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: '[DB] Query failed',
            model,
            action,
            durationMs,
            correlationId,
            tenantId,
            error: error instanceof Error ? error.message : String(error),
          })
        );
      }
    }

    return result;
  };
}

// ============================================================
// OPTIMIZED PRISMA CLIENT FACTORY
// ============================================================

export function createOptimizedPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Attach performance middleware
  client.$use(createQueryPerformanceMiddleware());

  return client;
}

// ============================================================
// QUERY STATS SNAPSHOT (for observability endpoint)
// ============================================================

export interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  slowQueryRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  topSlowModels: Array<{ model: string; action: string; avgMs: number; count: number }>;
  n1Suspects: Array<{ model: string; action: string; count: number }>;
}

export function getQueryStats(): QueryStats {
  const now = Date.now();
  const windowMs = 60_000; // last 60 seconds
  const recent = queryTraceBuffer.filter((t) => t.timestamp >= now - windowMs);

  if (recent.length === 0) {
    return {
      totalQueries: 0,
      slowQueries: 0,
      slowQueryRate: 0,
      avgDurationMs: 0,
      p95DurationMs: 0,
      topSlowModels: [],
      n1Suspects: [],
    };
  }

  const slowQueries = recent.filter((t) => t.durationMs > SLOW_QUERY_THRESHOLD_MS);
  const durations = recent.map((t) => t.durationMs).sort((a, b) => a - b);
  const p95Index = Math.floor(durations.length * 0.95);

  // Group by model+action for slow query analysis
  const modelGroups: Record<string, { total: number; count: number }> = {};
  for (const t of recent) {
    const key = `${t.model}.${t.action}`;
    if (!modelGroups[key]) modelGroups[key] = { total: 0, count: 0 };
    modelGroups[key].total += t.durationMs;
    modelGroups[key].count += 1;
  }

  const topSlowModels = Object.entries(modelGroups)
    .map(([key, stats]) => {
      const [model, action] = key.split('.');
      return { model, action, avgMs: Math.round(stats.total / stats.count), count: stats.count };
    })
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 10);

  // N+1 suspects: same model+action called 5+ times in 100ms windows
  const n1Window = 100;
  const n1Suspects: Array<{ model: string; action: string; count: number }> = [];
  const n1Groups: Record<string, number> = {};
  for (const t of recent) {
    const windowKey = `${t.model}.${t.action}.${Math.floor(t.timestamp / n1Window)}`;
    n1Groups[windowKey] = (n1Groups[windowKey] ?? 0) + 1;
  }
  for (const [key, count] of Object.entries(n1Groups)) {
    if (count >= N1_DETECTION_THRESHOLD) {
      const parts = key.split('.');
      n1Suspects.push({ model: parts[0], action: parts[1], count });
    }
  }

  return {
    totalQueries: recent.length,
    slowQueries: slowQueries.length,
    slowQueryRate:
      recent.length > 0
        ? Math.round((slowQueries.length / recent.length) * 10000) / 100
        : 0,
    avgDurationMs:
      recent.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
    p95DurationMs: durations[p95Index] ?? 0,
    topSlowModels,
    n1Suspects,
  };
}

// ============================================================
// PAGINATION ENFORCEMENT HELPER
// ============================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  maxPageSize?: number;
}

export function enforcePagination(params: PaginationParams): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const maxPageSize = params.maxPageSize ?? 100;
  const pageSize = Math.min(params.pageSize ?? 20, maxPageSize);
  const page = Math.max(params.page ?? 1, 1);
  const skip = (page - 1) * pageSize;

  return { skip, take: pageSize, page, pageSize };
}

// ============================================================
// SELECT OPTIMIZATION HELPERS
// ============================================================

/** Minimal order select for list views — avoids over-fetching */
export const orderListSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  total: true,
  currency: true,
  createdAt: true,
  customerId: true,
  storeId: true,
  customer: {
    select: { id: true, name: true, email: true },
  },
} as const;

/** Minimal customer select for list views */
export const customerListSelect = {
  id: true,
  email: true,
  name: true,
  status: true,
  totalSpent: true,
  totalOrders: true,
  createdAt: true,
  storeId: true,
} as const;

/** Minimal product select for list views */
export const productListSelect = {
  id: true,
  name: true,
  sku: true,
  price: true,
  status: true,
  updatedAt: true,
  storeId: true,
} as const;
