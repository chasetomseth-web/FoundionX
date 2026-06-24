/**
 * MerchantOS Distributed Tracing System
 * traceId / spanId / parentSpanId across full request lifecycle
 */

import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  service: string;
  operation: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error' | 'timeout';
  tenantId?: string;
  tags: Record<string, string | number | boolean>;
  error?: string;
}

export interface Trace {
  traceId: string;
  rootSpanId: string;
  spans: Span[];
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
  tenantId?: string;
  service: string;
  operation: string;
}

// ============================================================
// IN-MEMORY TRACE STORE (last 500 traces for debug viewer)
// ============================================================

const TRACE_BUFFER_SIZE = 500;
const traceStore = new Map<string, Trace>();
const traceIndex: string[] = [];

export function storeTrace(trace: Trace): void {
  traceStore.set(trace.traceId, trace);
  traceIndex.push(trace.traceId);
  if (traceIndex.length > TRACE_BUFFER_SIZE) {
    const oldest = traceIndex.shift();
    if (oldest) traceStore.delete(oldest);
  }
}

export function getTrace(traceId: string): Trace | undefined {
  return traceStore.get(traceId);
}

export function getRecentTraces(limit = 50, tenantId?: string): Trace[] {
  const all = [...traceIndex]
    .reverse()
    .map(id => traceStore.get(id))
    .filter((t): t is Trace => !!t);
  if (tenantId) return all.filter(t => t.tenantId === tenantId).slice(0, limit);
  return all.slice(0, limit);
}

// ============================================================
// SPAN BUILDER
// ============================================================

export function createSpan(params: {
  traceId: string;
  service: string;
  operation: string;
  parentSpanId?: string;
  tenantId?: string;
  tags?: Record<string, string | number | boolean>;
}): Span {
  return {
    traceId: params.traceId,
    spanId: crypto.randomUUID(),
    parentSpanId: params.parentSpanId,
    service: params.service,
    operation: params.operation,
    startTime: Date.now(),
    status: 'ok',
    tenantId: params.tenantId,
    tags: params.tags ?? {},
  };
}

export function finishSpan(span: Span, status: 'ok' | 'error' | 'timeout' = 'ok', error?: string): Span {
  span.endTime = Date.now();
  span.durationMs = span.endTime - span.startTime;
  span.status = status;
  if (error) span.error = error;
  return span;
}

// ============================================================
// TRACE CONTEXT (request-scoped)
// ============================================================

export class TraceContext {
  readonly traceId: string;
  readonly rootSpanId: string;
  private spans: Span[] = [];
  private startTime: number;
  tenantId?: string;

  constructor(traceId?: string, tenantId?: string) {
    this.traceId = traceId ?? crypto.randomUUID();
    this.startTime = Date.now();
    this.tenantId = tenantId;
    // Create root span
    const root = createSpan({
      traceId: this.traceId,
      service: 'api',
      operation: 'request',
      tenantId,
    });
    this.rootSpanId = root.spanId;
    this.spans.push(root);
  }

  startSpan(service: string, operation: string, parentSpanId?: string, tags?: Record<string, string | number | boolean>): Span {
    const span = createSpan({
      traceId: this.traceId,
      service,
      operation,
      parentSpanId: parentSpanId ?? this.rootSpanId,
      tenantId: this.tenantId,
      tags,
    });
    this.spans.push(span);
    return span;
  }

  endSpan(span: Span, status: 'ok' | 'error' | 'timeout' = 'ok', error?: string): void {
    finishSpan(span, status, error);
  }

  finish(service = 'api', operation = 'request'): Trace {
    const endTime = Date.now();
    // Finish root span
    const root = this.spans.find(s => s.spanId === this.rootSpanId);
    if (root && !root.endTime) finishSpan(root);

    const trace: Trace = {
      traceId: this.traceId,
      rootSpanId: this.rootSpanId,
      spans: this.spans,
      startTime: this.startTime,
      endTime,
      totalDurationMs: endTime - this.startTime,
      tenantId: this.tenantId,
      service,
      operation,
    };
    storeTrace(trace);
    return trace;
  }

  toHeaders(): Record<string, string> {
    return {
      'x-trace-id': this.traceId,
      'x-span-id': this.rootSpanId,
    };
  }
}

// ============================================================
// EXTRACT TRACE FROM REQUEST HEADERS
// ============================================================

export function extractTraceContext(headers: Headers): { traceId?: string; spanId?: string } {
  return {
    traceId: headers.get('x-trace-id') ?? undefined,
    spanId: headers.get('x-span-id') ?? undefined,
  };
}
