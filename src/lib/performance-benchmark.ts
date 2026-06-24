/**
 * MerchantOS — Performance Benchmarking Module
 * Production thresholds, bottleneck detection, optimization recommendations
 */

import { apiMetrics, dbMetrics, cacheMetrics, queueMetrics, webhookMetrics } from './metrics';
import { systemLog } from './logger';

// ============================================================
// PRODUCTION THRESHOLDS
// ============================================================

export const PRODUCTION_THRESHOLDS = {
  api: {
    avgLatencyMs: { excellent: 100, acceptable: 300, critical: 1000 },
    p95LatencyMs: { excellent: 300, acceptable: 800, critical: 2000 },
    p99LatencyMs: { excellent: 500, acceptable: 1500, critical: 5000 },
    errorRatePct: { excellent: 0.1, acceptable: 1, critical: 5 },
    throughputPerMin: { minimum: 10 },
  },
  db: {
    avgQueryMs: { excellent: 50, acceptable: 200, critical: 500 },
    p95QueryMs: { excellent: 150, acceptable: 500, critical: 1000 },
    slowQueryRatePct: { excellent: 1, acceptable: 5, critical: 15 },
    connectionPoolSaturationPct: { acceptable: 70, critical: 90 },
  },
  cache: {
    hitRatePct: { excellent: 95, acceptable: 80, critical: 60 },
    evictionRatePerMin: { acceptable: 100, critical: 1000 },
  },
  queue: {
    avgProcessingMs: { excellent: 500, acceptable: 2000, critical: 10000 },
    retryRatePct: { excellent: 1, acceptable: 5, critical: 15 },
    backlogSize: { acceptable: 500, critical: 2000 },
    dlqVolume: { acceptable: 10, critical: 100 },
  },
  webhook: {
    successRatePct: { excellent: 99, acceptable: 95, critical: 90 },
    avgLatencyMs: { excellent: 200, acceptable: 1000, critical: 5000 },
  },
  storefront: {
    renderTimeMs: { excellent: 50, acceptable: 200, critical: 1000 },
    checkoutResponseMs: { excellent: 300, acceptable: 1000, critical: 3000 },
  },
} as const;

// ============================================================
// TYPES
// ============================================================

export type BenchmarkRating = 'excellent' | 'acceptable' | 'degraded' | 'critical' | 'no_data';

export interface BenchmarkMetric {
  name: string;
  value: number | null;
  unit: string;
  rating: BenchmarkRating;
  threshold: { excellent?: number; acceptable: number; critical: number };
  recommendation?: string;
}

export interface BenchmarkCategory {
  category: string;
  overallRating: BenchmarkRating;
  score: number; // 0-100
  metrics: BenchmarkMetric[];
  bottlenecks: string[];
  recommendations: string[];
}

export interface PerformanceBenchmarkReport {
  timestamp: string;
  overallScore: number; // 0-100
  overallRating: BenchmarkRating;
  categories: BenchmarkCategory[];
  topBottlenecks: string[];
  topRecommendations: string[];
  productionReadiness: {
    apiLayer: boolean;
    databaseLayer: boolean;
    cacheLayer: boolean;
    queueLayer: boolean;
    webhookLayer: boolean;
  };
}

// ============================================================
// RATING HELPER
// ============================================================

function rateMetric(
  value: number | null,
  thresholds: { excellent?: number; acceptable: number; critical: number },
  lowerIsBetter = true
): BenchmarkRating {
  if (value === null || value === 0) return 'no_data';

  if (lowerIsBetter) {
    if (thresholds.excellent !== undefined && value <= thresholds.excellent) return 'excellent';
    if (value <= thresholds.acceptable) return 'acceptable';
    if (value <= thresholds.critical) return 'degraded';
    return 'critical';
  } else {
    // Higher is better (e.g., hit rate, throughput)
    if (thresholds.excellent !== undefined && value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.acceptable) return 'acceptable';
    if (value >= thresholds.critical) return 'degraded';
    return 'critical';
  }
}

function ratingToScore(rating: BenchmarkRating): number {
  switch (rating) {
    case 'excellent': return 100;
    case 'acceptable': return 75;
    case 'degraded': return 40;
    case 'critical': return 10;
    case 'no_data': return 50; // neutral — no data yet
    default: return 50;
  }
}

function categoryScore(metrics: BenchmarkMetric[]): number {
  if (metrics.length === 0) return 50;
  const scores = metrics.map(m => ratingToScore(m.rating));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function overallRating(score: number): BenchmarkRating {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'acceptable';
  if (score >= 40) return 'degraded';
  return 'critical';
}

// ============================================================
// API LAYER BENCHMARK
// ============================================================

function benchmarkApiLayer(windowMs = 3600000): BenchmarkCategory {
  const stats = apiMetrics.getStats(windowMs);
  const t = PRODUCTION_THRESHOLDS.api;

  const metrics: BenchmarkMetric[] = [
    {
      name: 'avg_latency',
      value: stats.totalRequests > 0 ? stats.avgLatencyMs : null,
      unit: 'ms',
      rating: rateMetric(stats.totalRequests > 0 ? stats.avgLatencyMs : null, t.avgLatencyMs),
      threshold: t.avgLatencyMs,
      recommendation: stats.avgLatencyMs > t.avgLatencyMs.acceptable ? 'Add response caching for read-heavy endpoints; optimize DB queries in hot paths' : undefined,
    },
    {
      name: 'p95_latency',
      value: stats.totalRequests > 0 ? stats.p95LatencyMs : null,
      unit: 'ms',
      rating: rateMetric(stats.totalRequests > 0 ? stats.p95LatencyMs : null, t.p95LatencyMs),
      threshold: t.p95LatencyMs,
      recommendation: stats.p95LatencyMs > t.p95LatencyMs.acceptable ? 'Investigate tail latency — likely DB slow queries or external API calls in critical path' : undefined,
    },
    {
      name: 'p99_latency',
      value: stats.totalRequests > 0 ? stats.p99LatencyMs : null,
      unit: 'ms',
      rating: rateMetric(stats.totalRequests > 0 ? stats.p99LatencyMs : null, t.p99LatencyMs),
      threshold: t.p99LatencyMs,
    },
    {
      name: 'error_rate',
      value: stats.totalRequests > 0 ? stats.errorRate : null,
      unit: '%',
      rating: rateMetric(stats.totalRequests > 0 ? stats.errorRate : null, t.errorRatePct),
      threshold: t.errorRatePct,
      recommendation: stats.errorRate > t.errorRatePct.acceptable ? 'Review error tracker for top error categories; add circuit breakers for external service calls' : undefined,
    },
    {
      name: 'throughput',
      value: stats.totalRequests > 0 ? stats.throughputPerMin : null,
      unit: 'req/min',
      rating: stats.totalRequests === 0 ? 'no_data' : stats.throughputPerMin >= t.throughputPerMin.minimum ? 'acceptable' : 'degraded',
      threshold: { acceptable: t.throughputPerMin.minimum, critical: 0 },
    },
  ];

  const bottlenecks = metrics.filter(m => m.rating === 'critical' || m.rating === 'degraded').map(m => `API ${m.name}: ${m.value}${m.unit}`);
  const recommendations = metrics.filter(m => m.recommendation).map(m => m.recommendation!);

  return {
    category: 'api',
    overallRating: overallRating(categoryScore(metrics)),
    score: categoryScore(metrics),
    metrics,
    bottlenecks,
    recommendations,
  };
}

// ============================================================
// DATABASE LAYER BENCHMARK
// ============================================================

function benchmarkDatabaseLayer(windowMs = 3600000): BenchmarkCategory {
  const stats = dbMetrics.getStats(windowMs);
  const t = PRODUCTION_THRESHOLDS.db;

  const metrics: BenchmarkMetric[] = [
    {
      name: 'avg_query_latency',
      value: stats.totalQueries > 0 ? stats.avgQueryMs : null,
      unit: 'ms',
      rating: rateMetric(stats.totalQueries > 0 ? stats.avgQueryMs : null, t.avgQueryMs),
      threshold: t.avgQueryMs,
      recommendation: stats.avgQueryMs > t.avgQueryMs.acceptable ? 'Run EXPLAIN ANALYZE on slow queries; verify composite indexes are being used; check for N+1 patterns' : undefined,
    },
    {
      name: 'p95_query_latency',
      value: stats.totalQueries > 0 ? stats.p95QueryMs : null,
      unit: 'ms',
      rating: rateMetric(stats.totalQueries > 0 ? stats.p95QueryMs : null, t.p95QueryMs),
      threshold: t.p95QueryMs,
    },
    {
      name: 'slow_query_rate',
      value: stats.totalQueries > 0 ? stats.slowQueryRate : null,
      unit: '%',
      rating: rateMetric(stats.totalQueries > 0 ? stats.slowQueryRate : null, t.slowQueryRatePct),
      threshold: t.slowQueryRatePct,
      recommendation: stats.slowQueryRate > t.slowQueryRatePct.acceptable ? 'Enable pg_stat_statements; identify top slow queries; add missing indexes from 001_performance_indexes.sql' : undefined,
    },
  ];

  const bottlenecks = metrics.filter(m => m.rating === 'critical' || m.rating === 'degraded').map(m => `DB ${m.name}: ${m.value}${m.unit}`);
  const recommendations = metrics.filter(m => m.recommendation).map(m => m.recommendation!);

  if (stats.totalQueries === 0) {
    recommendations.push('No DB queries recorded — run load test to establish baseline performance metrics');
  }

  return {
    category: 'database',
    overallRating: overallRating(categoryScore(metrics)),
    score: categoryScore(metrics),
    metrics,
    bottlenecks,
    recommendations,
  };
}

// ============================================================
// CACHE LAYER BENCHMARK
// ============================================================

function benchmarkCacheLayer(windowMs = 3600000): BenchmarkCategory {
  const stats = cacheMetrics.getStats(windowMs);
  const t = PRODUCTION_THRESHOLDS.cache;
  const total = stats.hitCount + stats.missCount;

  const metrics: BenchmarkMetric[] = [
    {
      name: 'hit_rate',
      value: total > 0 ? stats.hitRate : null,
      unit: '%',
      rating: rateMetric(total > 0 ? stats.hitRate : null, { excellent: t.hitRatePct.excellent, acceptable: t.hitRatePct.acceptable, critical: t.hitRatePct.critical }, false),
      threshold: { excellent: t.hitRatePct.excellent, acceptable: t.hitRatePct.acceptable, critical: t.hitRatePct.critical },
      recommendation: total > 0 && stats.hitRate < t.hitRatePct.acceptable ? 'Increase Redis TTLs for stable data (products, settings); pre-warm cache on deployment; add cache-aside for dashboard KPIs' : undefined,
    },
    {
      name: 'eviction_count',
      value: stats.evictionCount,
      unit: 'events',
      rating: rateMetric(stats.evictionCount, { acceptable: t.evictionRatePerMin.acceptable, critical: t.evictionRatePerMin.critical }),
      threshold: { acceptable: t.evictionRatePerMin.acceptable, critical: t.evictionRatePerMin.critical },
      recommendation: stats.evictionCount > t.evictionRatePerMin.acceptable ? 'Increase Redis maxmemory; review eviction policy (allkeys-lru recommended for cache workloads)' : undefined,
    },
  ];

  const bottlenecks = metrics.filter(m => m.rating === 'critical' || m.rating === 'degraded').map(m => `Cache ${m.name}: ${m.value}${m.unit}`);
  const recommendations = metrics.filter(m => m.recommendation).map(m => m.recommendation!);

  if (total === 0) {
    recommendations.push('No cache operations recorded — ensure REDIS_URL is configured and cache layer is active');
  }

  return {
    category: 'cache',
    overallRating: overallRating(categoryScore(metrics)),
    score: categoryScore(metrics),
    metrics,
    bottlenecks,
    recommendations,
  };
}

// ============================================================
// QUEUE LAYER BENCHMARK
// ============================================================

function benchmarkQueueLayer(windowMs = 3600000): BenchmarkCategory {
  const stats = queueMetrics.getStats(windowMs);
  const t = PRODUCTION_THRESHOLDS.queue;

  const metrics: BenchmarkMetric[] = [
    {
      name: 'avg_processing_latency',
      value: stats.totalJobs > 0 ? stats.avgProcessingMs : null,
      unit: 'ms',
      rating: rateMetric(stats.totalJobs > 0 ? stats.avgProcessingMs : null, t.avgProcessingMs),
      threshold: t.avgProcessingMs,
      recommendation: stats.avgProcessingMs > t.avgProcessingMs.acceptable ? 'Increase worker concurrency; optimize job handlers; move heavy computation to analytics queue' : undefined,
    },
    {
      name: 'retry_rate',
      value: stats.totalJobs > 0 ? stats.retryRate : null,
      unit: '%',
      rating: rateMetric(stats.totalJobs > 0 ? stats.retryRate : null, t.retryRatePct),
      threshold: t.retryRatePct,
      recommendation: stats.retryRate > t.retryRatePct.acceptable ? 'Investigate DLQ for root cause; check external API reliability (Brevo, GoAffPro); add circuit breakers' : undefined,
    },
    {
      name: 'current_backlog',
      value: stats.currentBacklog,
      unit: 'jobs',
      rating: rateMetric(stats.currentBacklog, t.backlogSize),
      threshold: t.backlogSize,
      recommendation: stats.currentBacklog > t.backlogSize.acceptable ? 'Scale worker instances; increase concurrency for high-priority queues; shed analytics jobs temporarily' : undefined,
    },
    {
      name: 'dlq_volume',
      value: stats.dlqVolume,
      unit: 'jobs',
      rating: rateMetric(stats.dlqVolume, t.dlqVolume),
      threshold: t.dlqVolume,
      recommendation: stats.dlqVolume > t.dlqVolume.acceptable ? 'Review DLQ jobs via /api/jobs endpoint; fix root cause before replaying; alert on DLQ growth' : undefined,
    },
  ];

  const bottlenecks = metrics.filter(m => m.rating === 'critical' || m.rating === 'degraded').map(m => `Queue ${m.name}: ${m.value}${m.unit}`);
  const recommendations = metrics.filter(m => m.recommendation).map(m => m.recommendation!);

  return {
    category: 'queue',
    overallRating: overallRating(categoryScore(metrics)),
    score: categoryScore(metrics),
    metrics,
    bottlenecks,
    recommendations,
  };
}

// ============================================================
// WEBHOOK LAYER BENCHMARK
// ============================================================

function benchmarkWebhookLayer(windowMs = 3600000): BenchmarkCategory {
  const stats = webhookMetrics.getStats(windowMs);
  const t = PRODUCTION_THRESHOLDS.webhook;

  const metrics: BenchmarkMetric[] = [
    {
      name: 'success_rate',
      value: stats.totalWebhooks > 0 ? stats.successRate : null,
      unit: '%',
      rating: rateMetric(stats.totalWebhooks > 0 ? stats.successRate : null, { excellent: t.successRatePct.excellent, acceptable: t.successRatePct.acceptable, critical: t.successRatePct.critical }, false),
      threshold: { excellent: t.successRatePct.excellent, acceptable: t.successRatePct.acceptable, critical: t.successRatePct.critical },
      recommendation: stats.totalWebhooks > 0 && stats.successRate < t.successRatePct.acceptable ? 'Check webhook processor error logs; verify signature secrets; ensure idempotency keys are set' : undefined,
    },
    {
      name: 'avg_processing_latency',
      value: stats.totalWebhooks > 0 ? stats.avgLatencyMs : null,
      unit: 'ms',
      rating: rateMetric(stats.totalWebhooks > 0 ? stats.avgLatencyMs : null, t.avgLatencyMs),
      threshold: t.avgLatencyMs,
      recommendation: stats.avgLatencyMs > t.avgLatencyMs.acceptable ? 'Webhook handlers should return 200 immediately and process async via BullMQ queue' : undefined,
    },
  ];

  const bottlenecks = metrics.filter(m => m.rating === 'critical' || m.rating === 'degraded').map(m => `Webhook ${m.name}: ${m.value}${m.unit}`);
  const recommendations = metrics.filter(m => m.recommendation).map(m => m.recommendation!);

  return {
    category: 'webhook',
    overallRating: overallRating(categoryScore(metrics)),
    score: categoryScore(metrics),
    metrics,
    bottlenecks,
    recommendations,
  };
}

// ============================================================
// FULL BENCHMARK REPORT
// ============================================================

export function generatePerformanceBenchmark(windowMs = 3600000): PerformanceBenchmarkReport {
  const api = benchmarkApiLayer(windowMs);
  const database = benchmarkDatabaseLayer(windowMs);
  const cache = benchmarkCacheLayer(windowMs);
  const queue = benchmarkQueueLayer(windowMs);
  const webhook = benchmarkWebhookLayer(windowMs);

  const categories = [api, database, cache, queue, webhook];
  const overallScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length);

  const topBottlenecks = categories.flatMap(c => c.bottlenecks).slice(0, 5);
  const topRecommendations = categories.flatMap(c => c.recommendations).slice(0, 5);

  const productionReadiness = {
    apiLayer: api.score >= 70,
    databaseLayer: database.score >= 70,
    cacheLayer: cache.score >= 70,
    queueLayer: queue.score >= 70,
    webhookLayer: webhook.score >= 70,
  };

  const report: PerformanceBenchmarkReport = {
    timestamp: new Date().toISOString(),
    overallScore,
    overallRating: overallRating(overallScore),
    categories,
    topBottlenecks,
    topRecommendations,
    productionReadiness,
  };

  systemLog.info('Performance benchmark generated', {
    overallScore,
    overallRating: report.overallRating,
    productionReadiness,
  });

  return report;
}
