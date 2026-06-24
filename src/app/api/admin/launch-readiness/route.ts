import { NextRequest, NextResponse } from 'next/server';
import { runFullValidation } from '@/lib/validation-suite';
import { generatePerformanceBenchmark } from '@/lib/performance-benchmark';
import { computeHealthScore } from '@/lib/metrics';
import { getErrorStats } from '@/lib/error-tracker';
import { systemLog } from '@/lib/logger';

// ============================================================
// SCORING ENGINE
// ============================================================

function computeReliabilityScore(validationSuites: Awaited<ReturnType<typeof runFullValidation>>['suites']): number {
  const weights: Record<string, number> = {
    auth: 20, stripe: 20, queue: 15, webhook: 15, database: 15, brevo: 5, goaffpro: 5, storefront: 5,
  };
  let weightedScore = 0;
  let totalWeight = 0;

  for (const suite of validationSuites) {
    const weight = weights[suite.suite] ?? 5;
    const total = suite.passCount + suite.failCount + suite.warnCount;
    const suiteScore = total === 0 ? 50 : Math.round(((suite.passCount + suite.warnCount * 0.5) / total) * 100);
    weightedScore += suiteScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
}

function computeScalabilityScore(benchmark: ReturnType<typeof generatePerformanceBenchmark>): number {
  const { productionReadiness } = benchmark;
  const readyCount = Object.values(productionReadiness).filter(Boolean).length;
  const total = Object.keys(productionReadiness).length;
  const baseScore = Math.round((readyCount / total) * 100);

  // Penalize for critical bottlenecks
  const penalty = benchmark.topBottlenecks.length * 5;
  return Math.max(0, baseScore - penalty);
}

function computeSecurityScore(validationSuites: Awaited<ReturnType<typeof runFullValidation>>['suites']): number {
  const securitySuite = validationSuites.find(s => s.suite === 'security');
  if (!securitySuite) return 50;

  const total = securitySuite.passCount + securitySuite.failCount + securitySuite.warnCount;
  if (total === 0) return 50;

  // Security failures are critical — each fail is heavily penalized
  const score = Math.round(
    ((securitySuite.passCount + securitySuite.warnCount * 0.3) / total) * 100
  );
  return score;
}

function computePerformanceScore(benchmark: ReturnType<typeof generatePerformanceBenchmark>): number {
  return benchmark.overallScore;
}

function determineLaunchRecommendation(
  reliabilityScore: number,
  scalabilityScore: number,
  securityScore: number,
  performanceScore: number,
  criticalIssues: string[]
): { recommendation: 'LAUNCH_READY' | 'LAUNCH_WITH_CAUTION' | 'NOT_READY'; reason: string; blockers: string[] } {
  const blockers: string[] = [];

  if (securityScore < 60) blockers.push(`Security score ${securityScore}/100 is below minimum threshold (60)`);
  if (reliabilityScore < 60) blockers.push(`Reliability score ${reliabilityScore}/100 is below minimum threshold (60)`);

  const criticalSecurityIssues = criticalIssues.filter(i =>
    i.toLowerCase().includes('secret') || i.toLowerCase().includes('key') || i.toLowerCase().includes('webhook')
  );
  if (criticalSecurityIssues.length > 0) {
    blockers.push(...criticalSecurityIssues.map(i => `Critical security issue: ${i}`));
  }

  if (blockers.length > 0) {
    return {
      recommendation: 'NOT_READY',
      reason: `${blockers.length} blocker(s) must be resolved before launch`,
      blockers,
    };
  }

  const avgScore = (reliabilityScore + scalabilityScore + securityScore + performanceScore) / 4;
  const hasWarnings = criticalIssues.length > 0 || performanceScore < 70 || scalabilityScore < 70;

  if (avgScore >= 75 && !hasWarnings) {
    return {
      recommendation: 'LAUNCH_READY',
      reason: 'All systems validated. Performance, security, and reliability meet production thresholds.',
      blockers: [],
    };
  }

  return {
    recommendation: 'LAUNCH_WITH_CAUTION',
    reason: `Average score ${Math.round(avgScore)}/100. Address warnings before handling high traffic.`,
    blockers: criticalIssues.slice(0, 5),
  };
}

// ============================================================
// ROUTE HANDLER
// ============================================================

export async function GET(request: NextRequest) {
  const start = Date.now();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') ?? 'full'; // full | quick | benchmark | validation

  try {
    systemLog.info('Launch readiness report requested', { mode });

    // Quick health check mode
    if (mode === 'quick') {
      const { score, status, reasons } = computeHealthScore();
      return NextResponse.json({
        mode: 'quick',
        timestamp: new Date().toISOString(),
        systemStatus: status,
        healthScore: score,
        degradedReasons: reasons,
        durationMs: Date.now() - start,
      });
    }

    // Benchmark only mode
    if (mode === 'benchmark') {
      const benchmark = generatePerformanceBenchmark();
      return NextResponse.json({ mode: 'benchmark', timestamp: new Date().toISOString(), benchmark, durationMs: Date.now() - start });
    }

    // Validation only mode
    if (mode === 'validation') {
      const validation = await runFullValidation();
      return NextResponse.json({ mode: 'validation', timestamp: new Date().toISOString(), validation, durationMs: Date.now() - start });
    }

    // Full report mode (default)
    const [validation, benchmark] = await Promise.all([
      runFullValidation(),
      Promise.resolve(generatePerformanceBenchmark()),
    ]);

    const errorStats = getErrorStats();
    const { score: healthScore, status: healthStatus, reasons: degradedReasons } = computeHealthScore();

    // Compute dimension scores
    const reliabilityScore = computeReliabilityScore(validation.suites);
    const scalabilityScore = computeScalabilityScore(benchmark);
    const securityScore = computeSecurityScore(validation.suites);
    const performanceScore = computePerformanceScore(benchmark);
    const overallScore = Math.round((reliabilityScore + scalabilityScore + securityScore + performanceScore) / 4);

    // Collect critical issues
    const criticalIssues: string[] = [];
    for (const suite of validation.suites) {
      for (const result of suite.results) {
        if (result.status === 'fail') {
          criticalIssues.push(`[${suite.suite.toUpperCase()}] ${result.name}: ${result.message}`);
        }
      }
    }

    // Collect warnings
    const warnings: string[] = [];
    for (const suite of validation.suites) {
      for (const result of suite.results) {
        if (result.status === 'warn') {
          warnings.push(`[${suite.suite.toUpperCase()}] ${result.name}: ${result.message}`);
        }
      }
    }

    const launchDecision = determineLaunchRecommendation(
      reliabilityScore, scalabilityScore, securityScore, performanceScore, criticalIssues
    );

    // Post-launch monitoring priorities
    const monitoringPriorities = [
      { priority: 1, area: 'Stripe webhook processing', metric: 'webhook success rate', threshold: '>95%', action: 'Alert on failure spike; check DLQ immediately' },
      { priority: 2, area: 'Database query performance', metric: 'avg query latency', threshold: '<200ms', action: 'Enable pg_stat_statements; run EXPLAIN ANALYZE on slow queries' },
      { priority: 3, area: 'Authentication flow', metric: 'OAuth error rate', threshold: '<1%', action: 'Monitor /auth/callback error logs; check Supabase auth dashboard' },
      { priority: 4, area: 'Queue system health', metric: 'backlog size + DLQ volume', threshold: 'backlog<500, DLQ<10', action: 'Scale workers; investigate DLQ root cause' },
      { priority: 5, area: 'Cache hit rate', metric: 'Redis hit rate', threshold: '>80%', action: 'Review TTL configuration; pre-warm cache on deployment' },
      { priority: 6, area: 'API error rate', metric: 'error rate per route', threshold: '<2%', action: 'Check error tracker for new error categories; review recent deployments' },
      { priority: 7, area: 'Tenant isolation', metric: 'cross-tenant query attempts', threshold: '0', action: 'Immediate investigation if any cross-tenant query detected' },
    ];

    // Risk assessment
    const riskAssessment = {
      highRisks: criticalIssues.map(i => ({ risk: i, mitigation: 'Resolve before launch' })),
      mediumRisks: warnings.slice(0, 5).map(w => ({ risk: w, mitigation: 'Monitor closely post-launch' })),
      lowRisks: [
        { risk: 'Rate limiter uses in-memory store', mitigation: 'Upgrade to Redis-backed rate limiter for multi-instance deployments' },
        { risk: 'Trace/log buffers are in-memory', mitigation: 'Wire to external log aggregation (Datadog, Logtail, etc.) for persistence' },
        { risk: 'Metrics store is in-memory', mitigation: 'Integrate Prometheus/Grafana or similar for persistent metrics' },
      ],
    };

    const report = {
      mode: 'full',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,

      // ── SYSTEM STATUS ──
      systemStatus: {
        overall: launchDecision.recommendation,
        healthStatus,
        healthScore,
        degradedReasons,
      },

      // ── SCORES ──
      scores: {
        overall: overallScore,
        reliability: reliabilityScore,
        scalability: scalabilityScore,
        security: securityScore,
        performance: performanceScore,
      },

      // ── LAUNCH DECISION ──
      launchReadiness: {
        recommendation: launchDecision.recommendation,
        reason: launchDecision.reason,
        blockers: launchDecision.blockers,
        criticalIssues,
        warnings: warnings.slice(0, 10),
        criticalIssueCount: criticalIssues.length,
        warningCount: warnings.length,
      },

      // ── VALIDATION RESULTS ──
      validation: {
        overallStatus: validation.overallStatus,
        summary: validation.summary,
        totalDurationMs: validation.totalDurationMs,
        suites: validation.suites.map(s => ({
          suite: s.suite,
          status: s.status,
          score: Math.round(((s.passCount + s.warnCount * 0.5) / Math.max(s.results.length, 1)) * 100),
          passCount: s.passCount,
          failCount: s.failCount,
          warnCount: s.warnCount,
          skipCount: s.skipCount,
          durationMs: s.durationMs,
          results: s.results,
        })),
      },

      // ── PERFORMANCE BENCHMARK ──
      benchmark: {
        overallScore: benchmark.overallScore,
        overallRating: benchmark.overallRating,
        productionReadiness: benchmark.productionReadiness,
        topBottlenecks: benchmark.topBottlenecks,
        topRecommendations: benchmark.topRecommendations,
        categories: benchmark.categories.map(c => ({
          category: c.category,
          score: c.score,
          overallRating: c.overallRating,
          bottlenecks: c.bottlenecks,
          recommendations: c.recommendations,
          metrics: c.metrics,
        })),
      },

      // ── ERROR SUMMARY ──
      errorSummary: {
        totalErrors: errorStats.total,
        uniqueErrors: errorStats.uniqueErrors,
        unresolved: errorStats.unresolved,
        bySeverity: errorStats.bySeverity,
        byCategory: errorStats.byCategory,
      },

      // ── RISK ASSESSMENT ──
      riskAssessment,

      // ── POST-LAUNCH MONITORING ──
      postLaunchMonitoring: {
        priorities: monitoringPriorities,
        keyEndpoints: [
          { endpoint: '/api/health', purpose: 'Load balancer health check — poll every 30s' },
          { endpoint: '/api/admin/observability/overview', purpose: 'System overview dashboard' },
          { endpoint: '/api/admin/observability/errors', purpose: 'Error tracking dashboard' },
          { endpoint: '/api/admin/observability/webhooks', purpose: 'Webhook reliability monitoring' },
          { endpoint: '/api/admin/observability/queues', purpose: 'Queue health monitoring' },
          { endpoint: '/api/admin/db-health', purpose: 'Database performance monitoring' },
          { endpoint: '/api/admin/launch-readiness?mode=quick', purpose: 'Quick health snapshot' },
        ],
      },
    };

    systemLog.info('Launch readiness report generated', {
      recommendation: launchDecision.recommendation,
      overallScore,
      criticalIssues: criticalIssues.length,
      warnings: warnings.length,
      durationMs: Date.now() - start,
    });

    const httpStatus = launchDecision.recommendation === 'NOT_READY' ? 503 :
      launchDecision.recommendation === 'LAUNCH_WITH_CAUTION' ? 207 : 200;

    return NextResponse.json(report, { status: httpStatus });

  } catch (err: any) {
    systemLog.error('Launch readiness report failed', { error: err.message });
    return NextResponse.json(
      { error: 'Failed to generate launch readiness report', message: err.message, durationMs: Date.now() - start },
      { status: 500 }
    );
  }
}
