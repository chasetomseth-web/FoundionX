/**
 * MerchantOS — Database Health & Observability API
 * Tracks slow queries, connection pool saturation, index usage,
 * query frequency per endpoint, and tenant query distribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getQueryStats } from '@/lib/db-middleware';
import { getRedis } from '@/lib/redis-lock';

// ============================================================
// DB HEALTH ENDPOINT
// GET /api/admin/db-health
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const view = url.searchParams.get('view') ?? 'overview';

    switch (view) {
      case 'overview':
        return NextResponse.json(await getDBHealthOverview());

      case 'slow-queries':
        return NextResponse.json(await getSlowQueryReport());

      case 'index-usage':
        return NextResponse.json(await getIndexUsageStats());

      case 'connection-pool':
        return NextResponse.json(await getConnectionPoolStats());

      case 'tenant-distribution':
        return NextResponse.json(await getTenantQueryDistribution());

      case 'query-stats':
        return NextResponse.json(getQueryStats());

      default:
        return NextResponse.json({ error: 'Unknown view' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// ============================================================
// DB HEALTH OVERVIEW
// ============================================================

async function getDBHealthOverview() {
  const start = Date.now();

  // Ping DB
  let dbPingMs = -1;
  let dbStatus = 'healthy';
  try {
    const pingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbPingMs = Date.now() - pingStart;
  } catch {
    dbStatus = 'unhealthy';
  }

  // Ping Redis
  let redisPingMs = -1;
  let redisStatus = 'healthy';
  try {
    const redis = getRedis();
    const pingStart = Date.now();
    await redis.ping();
    redisPingMs = Date.now() - pingStart;
  } catch {
    redisStatus = 'unhealthy';
  }

  // Table sizes
  const tableSizes = await prisma.$queryRaw<
    Array<{ table_name: string; row_estimate: number; total_size: string }>
  >`
    SELECT
      relname AS table_name,
      reltuples::BIGINT AS row_estimate,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
    LIMIT 15
  `;

  // Active connections
  const connectionInfo = await prisma.$queryRaw<
    Array<{ state: string; count: number }>
  >`
    SELECT state, COUNT(*) as count
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state
  `;

  const queryStats = getQueryStats();

  return {
    status: dbStatus === 'healthy' && redisStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseMs: Date.now() - start,
    database: {
      status: dbStatus,
      pingMs: dbPingMs,
      tableSizes,
      connections: connectionInfo,
    },
    redis: {
      status: redisStatus,
      pingMs: redisPingMs,
    },
    queryPerformance: {
      last60s: queryStats,
    },
  };
}

// ============================================================
// SLOW QUERY REPORT
// ============================================================

async function getSlowQueryReport() {
  // pg_stat_statements — requires the extension to be enabled
  let pgStatStatements: unknown[] = [];
  try {
    pgStatStatements = await prisma.$queryRaw`
      SELECT
        query,
        calls,
        ROUND(total_exec_time::NUMERIC, 2) AS total_ms,
        ROUND(mean_exec_time::NUMERIC, 2) AS avg_ms,
        ROUND(max_exec_time::NUMERIC, 2) AS max_ms,
        ROUND(stddev_exec_time::NUMERIC, 2) AS stddev_ms,
        rows
      FROM pg_stat_statements
      WHERE mean_exec_time > 200
        AND query NOT LIKE '%pg_stat%'
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `;
  } catch {
    pgStatStatements = [{ note: 'pg_stat_statements extension not enabled' }];
  }

  const appStats = getQueryStats();

  return {
    timestamp: new Date().toISOString(),
    threshold_ms: 200,
    pg_stat_statements: pgStatStatements,
    app_layer: {
      slowQueries: appStats.slowQueries,
      slowQueryRate: appStats.slowQueryRate,
      topSlowModels: appStats.topSlowModels,
      n1Suspects: appStats.n1Suspects,
    },
  };
}

// ============================================================
// INDEX USAGE STATISTICS
// ============================================================

async function getIndexUsageStats() {
  const indexUsage = await prisma.$queryRaw<
    Array<{
      table_name: string;
      index_name: string;
      idx_scan: number;
      idx_tup_read: number;
      idx_tup_fetch: number;
    }>
  >`
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      s.idx_scan,
      s.idx_tup_read,
      s.idx_tup_fetch
    FROM pg_stat_user_indexes s
    JOIN pg_class t ON t.oid = s.relid
    JOIN pg_class i ON i.oid = s.indexrelid
    ORDER BY s.idx_scan DESC
    LIMIT 30
  `;

  // Unused indexes (potential candidates for removal)
  const unusedIndexes = await prisma.$queryRaw<
    Array<{ table_name: string; index_name: string; index_size: string }>
  >`
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size
    FROM pg_stat_user_indexes s
    JOIN pg_class t ON t.oid = s.relid
    JOIN pg_class i ON i.oid = s.indexrelid
    WHERE s.idx_scan = 0
      AND i.relname NOT LIKE '%_pkey'
    ORDER BY pg_relation_size(s.indexrelid) DESC
    LIMIT 10
  `;

  return {
    timestamp: new Date().toISOString(),
    indexUsage,
    unusedIndexes,
    recommendation: 'Indexes with idx_scan=0 may be candidates for removal after 30+ days of production traffic',
  };
}

// ============================================================
// CONNECTION POOL STATS
// ============================================================

async function getConnectionPoolStats() {
  const poolStats = await prisma.$queryRaw<
    Array<{
      state: string;
      wait_event_type: string | null;
      wait_event: string | null;
      count: number;
    }>
  >`
    SELECT
      state,
      wait_event_type,
      wait_event,
      COUNT(*) as count
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state, wait_event_type, wait_event
    ORDER BY count DESC
  `;

  const maxConnections = await prisma.$queryRaw<Array<{ max_conn: number }>>`
    SELECT setting::INT AS max_conn FROM pg_settings WHERE name = 'max_connections'
  `;

  const currentConnections = await prisma.$queryRaw<Array<{ current: number }>>`
    SELECT COUNT(*) AS current FROM pg_stat_activity WHERE datname = current_database()
  `;

  const maxConn = maxConnections[0]?.max_conn ?? 100;
  const currentConn = Number(currentConnections[0]?.current ?? 0);
  const saturationPct = Math.round((currentConn / maxConn) * 100);

  return {
    timestamp: new Date().toISOString(),
    maxConnections: maxConn,
    currentConnections: currentConn,
    saturationPercent: saturationPct,
    saturationStatus: saturationPct > 80 ? 'critical' : saturationPct > 60 ? 'warning' : 'healthy',
    breakdown: poolStats,
    pgbouncerNote: 'With PgBouncer in transaction mode, currentConnections reflects PgBouncer server connections, not client connections',
  };
}

// ============================================================
// TENANT QUERY DISTRIBUTION
// ============================================================

async function getTenantQueryDistribution() {
  // Top tenants by order volume (proxy for query load)
  const topTenantsByOrders = await prisma.$queryRaw<
    Array<{ store_id: string; order_count: number; revenue: number }>
  >`
    SELECT
      "storeId" AS store_id,
      COUNT(*) AS order_count,
      SUM("total")::FLOAT AS revenue
    FROM "Order" WHERE"createdAt" >= NOW() - INTERVAL '24 hours'
    GROUP BY "storeId"
    ORDER BY order_count DESC
    LIMIT 10
  `;

  // Top tenants by analytics events
  const topTenantsByEvents = await prisma.$queryRaw<
    Array<{ store_id: string; event_count: number }>
  >`
    SELECT
      "storeId" AS store_id,
      COUNT(*) AS event_count
    FROM "AnalyticsEvent" WHERE"createdAt" >= NOW() - INTERVAL '24 hours'
    GROUP BY "storeId"
    ORDER BY event_count DESC
    LIMIT 10
  `;

  return {
    timestamp: new Date().toISOString(),
    window: '24h',
    topTenantsByOrders,
    topTenantsByEvents,
  };
}
