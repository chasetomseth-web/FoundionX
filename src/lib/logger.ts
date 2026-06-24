/**
 * MerchantOS Structured Logging System
 * JSON logs with correlationId, tenantId, service tagging, and log levels
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type ServiceName = 'api' | 'webhook' | 'queue' | 'db' | 'storefront' | 'cache' | 'auth' | 'stripe' | 'goaffpro' | 'brevo' | 'reconcile' | 'system';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: ServiceName;
  message: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  [key: string]: unknown;
}

// ============================================================
// IN-MEMORY LOG STORE (for admin debug viewer, last 1000 entries)
// ============================================================

const LOG_BUFFER_SIZE = 1000;
const logBuffer: LogEntry[] = [];

export function getRecentLogs(limit = 100, filters?: { level?: LogLevel; service?: ServiceName; tenantId?: string }): LogEntry[] {
  let entries = [...logBuffer].reverse();
  if (filters?.level) entries = entries.filter(e => e.level === filters.level);
  if (filters?.service) entries = entries.filter(e => e.service === filters.service);
  if (filters?.tenantId) entries = entries.filter(e => e.tenantId === filters.tenantId);
  return entries.slice(0, limit);
}

// ============================================================
// CORE LOGGER
// ============================================================

function writeLog(entry: LogEntry): void {
  // Push to in-memory buffer
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.shift();

  const serialized = JSON.stringify(entry);
  switch (entry.level) {
    case 'critical': case'error':
      console.error(serialized);
      break;
    case 'warn':
      console.warn(serialized);
      break;
    default:
      console.log(serialized);
  }
}

function createEntry(
  level: LogLevel,
  service: ServiceName,
  message: string,
  context: Partial<LogEntry> = {}
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...context,
  };
}

// ============================================================
// SERVICE LOGGER FACTORY
// ============================================================

export function createServiceLogger(service: ServiceName) {
  return {
    debug: (message: string, ctx: Partial<LogEntry> = {}) =>
      writeLog(createEntry('debug', service, message, ctx)),
    info: (message: string, ctx: Partial<LogEntry> = {}) =>
      writeLog(createEntry('info', service, message, ctx)),
    warn: (message: string, ctx: Partial<LogEntry> = {}) =>
      writeLog(createEntry('warn', service, message, ctx)),
    error: (message: string, ctx: Partial<LogEntry> = {}) =>
      writeLog(createEntry('error', service, message, ctx)),
    critical: (message: string, ctx: Partial<LogEntry> = {}) =>
      writeLog(createEntry('critical', service, message, ctx)),
  };
}

// ============================================================
// DOMAIN LOGGERS
// ============================================================

export const apiLog = createServiceLogger('api');
export const webhookLog = createServiceLogger('webhook');
export const queueLog = createServiceLogger('queue');
export const dbLog = createServiceLogger('db');
export const cacheLog = createServiceLogger('cache');
export const authLog = createServiceLogger('auth');
export const stripeLog = createServiceLogger('stripe');
export const goaffproLog = createServiceLogger('goaffpro');
export const brevoLog = createServiceLogger('brevo');
export const storefrontLog = createServiceLogger('storefront');
export const systemLog = createServiceLogger('system');

// ============================================================
// REQUEST CONTEXT HELPERS
// ============================================================

export function extractRequestContext(req: NextRequest): {
  requestId: string;
  correlationId: string;
  tenantId?: string;
  route: string;
  method: string;
} {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const correlationId = req.headers.get('x-correlation-id') ?? requestId;
  const tenantId = req.headers.get('x-tenant-id') ?? undefined;
  const route = new URL(req.url).pathname;
  const method = req.method;
  return { requestId, correlationId, tenantId, route, method };
}

// ============================================================
// PERFORMANCE TIMER
// ============================================================

export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

// ============================================================
// ERROR SERIALIZER
// ============================================================

export function serializeError(err: unknown): { message: string; stack?: string; code?: string } {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: (err as any).code,
    };
  }
  return { message: String(err) };
}

function createLogger(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: createLogger is not implemented yet.', args);
  return null;
}

export { createLogger };