/**
 * MerchantOS Metrics Collection Layer
 * Real-time metrics for API / DB / Queue / Webhook / Cache
 */

// ============================================================
// TYPES
// ============================================================

export interface MetricPoint {
  timestamp: number;
  value: number;
  tenantId?: string;
  labels?: Record<string, string>;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
}

// ============================================================
// IN-MEMORY METRICS STORE
// ============================================================

const MAX_POINTS = 2000;
const metricsStore = new Map<string, MetricPoint[]>();

function record(name: string, value: number, tenantId?: string, labels?: Record<string, string>): void {
  if (!metricsStore.has(name)) metricsStore.set(name, []);
  const series = metricsStore.get(name)!;
  series.push({ timestamp: Date.now(), value, tenantId, labels });
  if (series.length > MAX_POINTS) series.shift();
}

function getSeries(name: string, windowMs = 3600000, tenantId?: string): MetricPoint[] {
  const cutoff = Date.now() - windowMs;
  const series = metricsStore.get(name) ?? [];
  return series.filter(p => p.timestamp >= cutoff && (!tenantId || p.tenantId === tenantId));
}

function avg(points: MetricPoint[]): number {
  if (!points.length) return 0;
  return points.reduce((s, p) => s + p.value, 0) / points.length;
}

function sum(points: MetricPoint[]): number {
  return points.reduce((s, p) => s + p.value, 0);
}

function percentile(points: MetricPoint[], p: number): number {
  if (!points.length) return 0;
  const sorted = [...points].sort((a, b) => a.value - b.value);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)].value;
}

// ============================================================
// API METRICS
// ============================================================

export const apiMetrics = {
  recordRequest(route: string, method: string, statusCode: number, durationMs: number, tenantId?: string) {
    record('api.request.latency', durationMs, tenantId, { route, method, statusCode: String(statusCode) });
    record('api.request.count', 1, tenantId, { route, method });
    if (statusCode >= 400) record('api.request.errors', 1, tenantId, { route, statusCode: String(statusCode) });
  },

  getStats(windowMs = 3600000, tenantId?: string) {
    const latency = getSeries('api.request.latency', windowMs, tenantId);
    const errors = getSeries('api.request.errors', windowMs, tenantId);
    const total = getSeries('api.request.count', windowMs, tenantId);
    return {
      avgLatencyMs: Math.round(avg(latency)),
      p95LatencyMs: Math.round(percentile(latency, 95)),
      p99LatencyMs: Math.round(percentile(latency, 99)),
      totalRequests: sum(total),
      errorCount: sum(errors),
      errorRate: total.length > 0 ? Math.round((sum(errors) / sum(total)) * 10000) / 100 : 0,
      throughputPerMin: Math.round((sum(total) / (windowMs / 60000)) * 100) / 100,
    };
  },

  getLatencySeries(windowMs = 3600000): MetricPoint[] {
    return getSeries('api.request.latency', windowMs);
  },
};

// ============================================================
// DB METRICS
// ============================================================

export const dbMetrics = {
  recordQuery(model: string, operation: string, durationMs: number, tenantId?: string) {
    record('db.query.latency', durationMs, tenantId, { model, operation });
    record('db.query.count', 1, tenantId, { model, operation });
    if (durationMs > 200) record('db.slow_query.count', 1, tenantId, { model, operation });
  },

  recordConnectionPool(active: number, idle: number, waiting: number) {
    record('db.pool.active', active);
    record('db.pool.idle', idle);
    record('db.pool.waiting', waiting);
  },

  getStats(windowMs = 3600000) {
    const latency = getSeries('db.query.latency', windowMs);
    const slow = getSeries('db.slow_query.count', windowMs);
    const total = getSeries('db.query.count', windowMs);
    return {
      avgQueryMs: Math.round(avg(latency)),
      p95QueryMs: Math.round(percentile(latency, 95)),
      slowQueryCount: sum(slow),
      totalQueries: sum(total),
      slowQueryRate: total.length > 0 ? Math.round((sum(slow) / sum(total)) * 10000) / 100 : 0,
    };
  },
};

// ============================================================
// QUEUE METRICS
// ============================================================

export const queueMetrics = {
  recordJobProcessed(queueName: string, durationMs: number, success: boolean, tenantId?: string) {
    record('queue.job.latency', durationMs, tenantId, { queue: queueName });
    record('queue.job.count', 1, tenantId, { queue: queueName, status: success ? 'success' : 'failed' });
    if (!success) record('queue.job.failed', 1, tenantId, { queue: queueName });
  },

  recordBacklog(queueName: string, size: number) {
    record('queue.backlog', size, undefined, { queue: queueName });
  },

  recordDLQ(queueName: string, count: number) {
    record('queue.dlq', count, undefined, { queue: queueName });
  },

  getStats(windowMs = 3600000) {
    const latency = getSeries('queue.job.latency', windowMs);
    const failed = getSeries('queue.job.failed', windowMs);
    const total = getSeries('queue.job.count', windowMs);
    const backlog = getSeries('queue.backlog', 60000);
    const dlq = getSeries('queue.dlq', windowMs);
    return {
      avgProcessingMs: Math.round(avg(latency)),
      totalJobs: sum(total),
      failedJobs: sum(failed),
      retryRate: total.length > 0 ? Math.round((sum(failed) / sum(total)) * 10000) / 100 : 0,
      currentBacklog: backlog.length > 0 ? backlog[backlog.length - 1].value : 0,
      dlqVolume: sum(dlq),
    };
  },
};

// ============================================================
// WEBHOOK METRICS
// ============================================================

export const webhookMetrics = {
  recordWebhook(provider: string, success: boolean, durationMs: number, tenantId?: string) {
    record('webhook.latency', durationMs, tenantId, { provider });
    record('webhook.count', 1, tenantId, { provider, status: success ? 'success' : 'failed' });
    if (!success) record('webhook.failed', 1, tenantId, { provider });
  },

  getStats(windowMs = 3600000) {
    const latency = getSeries('webhook.latency', windowMs);
    const failed = getSeries('webhook.failed', windowMs);
    const total = getSeries('webhook.count', windowMs);

    const byProvider: Record<string, { success: number; failed: number; avgLatencyMs: number }> = {};
    for (const p of ['stripe', 'goaffpro', 'brevo']) {
      const pLatency = latency.filter(pt => pt.labels?.provider === p);
      const pFailed = failed.filter(pt => pt.labels?.provider === p);
      const pTotal = total.filter(pt => pt.labels?.provider === p);
      byProvider[p] = {
        success: pTotal.length - pFailed.length,
        failed: sum(pFailed),
        avgLatencyMs: Math.round(avg(pLatency)),
      };
    }

    return {
      totalWebhooks: sum(total),
      failedWebhooks: sum(failed),
      successRate: total.length > 0 ? Math.round(((sum(total) - sum(failed)) / sum(total)) * 10000) / 100 : 100,
      avgLatencyMs: Math.round(avg(latency)),
      byProvider,
    };
  },
};

// ============================================================
// CACHE METRICS
// ============================================================

export const cacheMetrics = {
  recordHit(tenantId?: string) {
    record('cache.hit', 1, tenantId);
  },

  recordMiss(tenantId?: string) {
    record('cache.miss', 1, tenantId);
  },

  recordEviction() {
    record('cache.eviction', 1);
  },

  getStats(windowMs = 3600000) {
    const hits = getSeries('cache.hit', windowMs);
    const misses = getSeries('cache.miss', windowMs);
    const evictions = getSeries('cache.eviction', windowMs);
    const totalOps = sum(hits) + sum(misses);
    return {
      hitCount: sum(hits),
      missCount: sum(misses),
      hitRate: totalOps > 0 ? Math.round((sum(hits) / totalOps) * 10000) / 100 : 0,
      evictionCount: sum(evictions),
    };
  },
};

// ============================================================
// SYSTEM HEALTH SCORE
// ============================================================

export function computeHealthScore(): { score: number; status: 'green' | 'yellow' | 'red'; reasons: string[] } {
  const api = apiMetrics.getStats(300000);
  const db = dbMetrics.getStats(300000);
  const cache = cacheMetrics.getStats(300000);
  const queue = queueMetrics.getStats(300000);
  const webhook = webhookMetrics.getStats(300000);

  const issues: string[] = [];
  let deductions = 0;

  if (api.errorRate > 5) { issues.push(`API error rate ${api.errorRate}% > 5%`); deductions += 30; }
  else if (api.errorRate > 2) { issues.push(`API error rate ${api.errorRate}% > 2%`); deductions += 15; }

  if (db.avgQueryMs > 300) { issues.push(`DB avg query ${db.avgQueryMs}ms > 300ms`); deductions += 20; }
  else if (db.avgQueryMs > 200) { issues.push(`DB avg query ${db.avgQueryMs}ms > 200ms`); deductions += 10; }

  if (cache.hitRate < 80 && cache.hitCount + cache.missCount > 10) {
    issues.push(`Cache hit rate ${cache.hitRate}% < 80%`); deductions += 15;
  }

  if (queue.currentBacklog > 1000) { issues.push(`Queue backlog ${queue.currentBacklog} > 1000`); deductions += 20; }

  if (webhook.successRate < 95) { issues.push(`Webhook success rate ${webhook.successRate}% < 95%`); deductions += 20; }

  const score = Math.max(0, 100 - deductions);
  const status = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
  return { score, status, reasons: issues };
}
