/**
 * MerchantOS Error Tracking System
 * Severity classification, tenant-aware grouping, error categories
 */

import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory =
  | 'stripe_failure' |'webhook_failure' |'db_failure' |'queue_failure' |'auth_failure' |'storefront_failure' |'api_failure' |'cache_failure' |'unknown';

export interface TrackedError {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  route?: string;
  service?: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================
// ERROR STORE (in-memory, last 500 unique error groups)
// ============================================================

const ERROR_BUFFER = 500;
const errorStore = new Map<string, TrackedError>();
const errorIndex: string[] = [];

function fingerprint(category: ErrorCategory, message: string, route?: string): string {
  return crypto
    .createHash('sha256')
    .update(`${category}:${message}:${route ?? ''}`)
    .digest('hex')
    .slice(0, 16);
}

export function trackError(params: {
  error: unknown;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  route?: string;
  service?: string;
  metadata?: Record<string, unknown>;
}): TrackedError {
  const err = params.error instanceof Error ? params.error : new Error(String(params.error));
  const category = params.category ?? classifyError(err);
  const severity = params.severity ?? inferSeverity(category, err);
  const fp = fingerprint(category, err.message, params.route);
  const now = new Date().toISOString();

  if (errorStore.has(fp)) {
    const existing = errorStore.get(fp)!;
    existing.count += 1;
    existing.lastSeen = now;
    if (params.tenantId && !existing.tenantId) existing.tenantId = params.tenantId;
    return existing;
  }

  const tracked: TrackedError = {
    id: fp,
    timestamp: now,
    severity,
    category,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : err.stack?.split('\n').slice(0, 5).join('\n'),
    tenantId: params.tenantId,
    userId: params.userId,
    requestId: params.requestId,
    traceId: params.traceId,
    route: params.route,
    service: params.service,
    count: 1,
    firstSeen: now,
    lastSeen: now,
    resolved: false,
    metadata: params.metadata,
  };

  errorStore.set(fp, tracked);
  errorIndex.push(fp);
  if (errorIndex.length > ERROR_BUFFER) {
    const oldest = errorIndex.shift();
    if (oldest) errorStore.delete(oldest);
  }

  return tracked;
}

// ============================================================
// AUTO-CLASSIFY ERROR
// ============================================================

function classifyError(err: Error): ErrorCategory {
  const msg = err.message.toLowerCase();
  if (msg.includes('stripe') || msg.includes('payment') || msg.includes('charge')) return 'stripe_failure';
  if (msg.includes('webhook')) return 'webhook_failure';
  if (msg.includes('prisma') || msg.includes('database') || msg.includes('query') || msg.includes('connection')) return 'db_failure';
  if (msg.includes('queue') || msg.includes('bullmq') || msg.includes('job')) return 'queue_failure';
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('jwt')) return 'auth_failure';
  if (msg.includes('storefront') || msg.includes('render')) return 'storefront_failure';
  if (msg.includes('redis') || msg.includes('cache')) return 'cache_failure';
  return 'api_failure';
}

function inferSeverity(category: ErrorCategory, err: Error): ErrorSeverity {
  if (category === 'stripe_failure' || category === 'db_failure') return 'critical';
  if (category === 'webhook_failure' || category === 'queue_failure') return 'high';
  if (category === 'auth_failure') return 'medium';
  return 'low';
}

// ============================================================
// QUERY HELPERS
// ============================================================

export function getErrors(filters?: {
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  tenantId?: string;
  resolved?: boolean;
  limit?: number;
}): TrackedError[] {
  let errors = [...errorStore.values()].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );

  if (filters?.severity) errors = errors.filter(e => e.severity === filters.severity);
  if (filters?.category) errors = errors.filter(e => e.category === filters.category);
  if (filters?.tenantId) errors = errors.filter(e => e.tenantId === filters.tenantId);
  if (filters?.resolved !== undefined) errors = errors.filter(e => e.resolved === filters.resolved);

  return errors.slice(0, filters?.limit ?? 100);
}

export function resolveError(id: string): boolean {
  const err = errorStore.get(id);
  if (!err) return false;
  err.resolved = true;
  return true;
}

export function getErrorStats() {
  const all = [...errorStore.values()];
  const bySeverity: Record<ErrorSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const byCategory: Record<string, number> = {};

  for (const e of all) {
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + e.count;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.count;
  }

  return {
    total: all.reduce((s, e) => s + e.count, 0),
    uniqueErrors: all.length,
    unresolved: all.filter(e => !e.resolved).length,
    bySeverity,
    byCategory,
  };
}
