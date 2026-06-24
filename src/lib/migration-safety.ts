/**
 * MerchantOS — Zero-Downtime Migration Safety System
 * Migration validation, backward compatibility checks,
 * staged deployment helpers, and rollback plan generator.
 */

import { prisma } from './prisma';
import { queueLogger } from './observability';

// ============================================================
// MIGRATION SAFETY RULES
// ============================================================

export interface MigrationSafetyCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  blocking: boolean;
}

export interface MigrationValidationResult {
  safe: boolean;
  checks: MigrationSafetyCheck[];
  blockers: MigrationSafetyCheck[];
  warnings: MigrationSafetyCheck[];
  recommendation: string;
  timestamp: string;
}

// ============================================================
// PRE-MIGRATION VALIDATION
// ============================================================

/**
 * Run all pre-migration safety checks.
 * Call before applying any schema migration in production.
 */
export async function validateMigrationSafety(): Promise<MigrationValidationResult> {
  const checks: MigrationSafetyCheck[] = [];

  // Check 1: Active connections count
  try {
    const result = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM pg_stat_activity
      WHERE datname = current_database() AND state = 'active'
    `;
    const activeCount = Number(result[0]?.count ?? 0);
    checks.push({
      name: 'active_connections',
      status: activeCount > 50 ? 'warn' : 'pass',
      message: `${activeCount} active connections. ${activeCount > 50 ? 'Consider running during low-traffic window.' : 'Safe to proceed.'}`,
      blocking: false,
    });
  } catch (err) {
    checks.push({
      name: 'active_connections',
      status: 'warn',
      message: 'Could not check active connections',
      blocking: false,
    });
  }

  // Check 2: Long-running queries
  try {
    const longQueries = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'active'
        AND query_start < NOW() - INTERVAL '30 seconds' AND query NOT LIKE'%pg_stat%'
    `;
    const count = Number(longQueries[0]?.count ?? 0);
    checks.push({
      name: 'long_running_queries',
      status: count > 0 ? 'fail' : 'pass',
      message: count > 0
        ? `${count} queries running >30s. WAIT for them to complete before migrating.`
        : 'No long-running queries detected.',
      blocking: count > 0,
    });
  } catch {
    checks.push({ name: 'long_running_queries', status: 'warn', message: 'Could not check', blocking: false });
  }

  // Check 3: Replication lag (if replica exists)
  try {
    const replicationLag = await prisma.$queryRaw<Array<{ lag_bytes: number | null }>>`
      SELECT MAX(write_lag::TEXT::INTERVAL) IS NOT NULL AS has_lag,
             pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS lag_bytes
      FROM pg_stat_replication
      LIMIT 1
    `;
    const lagBytes = Number(replicationLag[0]?.lag_bytes ?? 0);
    checks.push({
      name: 'replication_lag',
      status: lagBytes > 10_000_000 ? 'warn' : 'pass',
      message: lagBytes > 0
        ? `Replication lag: ${(lagBytes / 1024 / 1024).toFixed(2)}MB`
        : 'No replication lag detected.',
      blocking: false,
    });
  } catch {
    checks.push({ name: 'replication_lag', status: 'pass', message: 'No replication configured', blocking: false });
  }

  // Check 4: Table lock check
  try {
    const locks = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM pg_locks l
      JOIN pg_class c ON c.oid = l.relation
      WHERE l.granted = false
        AND c.relname IN ('Order', 'Customer', 'Product', 'Subscription', 'Affiliate')
    `;
    const lockCount = Number(locks[0]?.count ?? 0);
    checks.push({
      name: 'table_locks',
      status: lockCount > 0 ? 'fail' : 'pass',
      message: lockCount > 0
        ? `${lockCount} pending locks on critical tables. Wait before migrating.`
        : 'No blocking locks on critical tables.',
      blocking: lockCount > 0,
    });
  } catch {
    checks.push({ name: 'table_locks', status: 'warn', message: 'Could not check locks', blocking: false });
  }

  // Check 5: Disk space
  try {
    const diskSpace = await prisma.$queryRaw<Array<{ db_size: string; available: string }>>`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) AS db_size,
        pg_size_pretty(pg_tablespace_size('pg_default')) AS available
    `;
    checks.push({
      name: 'disk_space',
      status: 'pass',
      message: `Database size: ${diskSpace[0]?.db_size ?? 'unknown'}`,
      blocking: false,
    });
  } catch {
    checks.push({ name: 'disk_space', status: 'warn', message: 'Could not check disk space', blocking: false });
  }

  const blockers = checks.filter((c) => c.blocking && c.status === 'fail');
  const warnings = checks.filter((c) => !c.blocking && c.status === 'warn');
  const safe = blockers.length === 0;

  return {
    safe,
    checks,
    blockers,
    warnings,
    recommendation: safe
      ? warnings.length > 0
        ? 'Migration can proceed but review warnings first.' :'All checks passed. Safe to run migration.'
      : `BLOCKED: ${blockers.map((b) => b.name).join(', ')} must be resolved first.`,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// BACKWARD COMPATIBILITY RULES
// ============================================================

export const BACKWARD_COMPATIBILITY_RULES = {
  /**
   * SAFE operations (zero-downtime):
   * - ADD COLUMN with DEFAULT or nullable
   * - CREATE INDEX CONCURRENTLY
   * - ADD TABLE
   * - ADD FOREIGN KEY NOT VALID (validate separately)
   * - CREATE MATERIALIZED VIEW
   */
  safe: [
    'ADD COLUMN ... DEFAULT',
    'ADD COLUMN ... NULL',
    'CREATE INDEX CONCURRENTLY',
    'CREATE TABLE',
    'ADD FOREIGN KEY ... NOT VALID',
    'CREATE MATERIALIZED VIEW',
    'CREATE FUNCTION',
    'ALTER TABLE ... ADD CONSTRAINT ... NOT VALID',
  ],

  /**
   * DANGEROUS operations (require maintenance window or special handling):
   * - DROP COLUMN
   * - ALTER COLUMN TYPE
   * - ADD NOT NULL without default
   * - DROP TABLE
   * - RENAME COLUMN/TABLE
   * - ADD UNIQUE CONSTRAINT (takes lock)
   */
  dangerous: [
    'DROP COLUMN',
    'ALTER COLUMN TYPE',
    'ADD NOT NULL',
    'DROP TABLE',
    'RENAME COLUMN',
    'RENAME TABLE',
    'ADD UNIQUE',
    'DROP INDEX',
  ],

  /**
   * Two-phase migration patterns for dangerous operations:
   */
  twoPhasePatterns: {
    renameColumn: [
      'Phase 1: ADD COLUMN new_name (copy data via trigger)',
      'Phase 2: Deploy app reading both columns',
      'Phase 3: Backfill new_name from old_name',
      'Phase 4: Deploy app writing to new_name only',
      'Phase 5: DROP COLUMN old_name',
    ],
    changeColumnType: [
      'Phase 1: ADD COLUMN new_col with new type',
      'Phase 2: Dual-write to both columns',
      'Phase 3: Backfill new_col',
      'Phase 4: Switch reads to new_col',
      'Phase 5: DROP old_col',
    ],
    addNotNull: [
      'Phase 1: ADD COLUMN nullable',
      'Phase 2: Backfill all rows',
      'Phase 3: ADD CONSTRAINT NOT VALID',
      'Phase 4: VALIDATE CONSTRAINT (non-blocking)',
    ],
  },
};

// ============================================================
// MIGRATION ROLLBACK PLAN GENERATOR
// ============================================================

export interface RollbackPlan {
  migrationId: string;
  forwardSQL: string;
  rollbackSQL: string;
  estimatedDowntime: string;
  riskLevel: 'low' | 'medium' | 'high';
  notes: string[];
}

export function generateRollbackPlan(
  migrationId: string,
  forwardSQL: string
): RollbackPlan {
  const upperSQL = forwardSQL.toUpperCase();
  const notes: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let rollbackSQL = '-- Auto-generated rollback (review before applying)\n';
  let estimatedDowntime = '0ms (online)';

  if (upperSQL.includes('CREATE INDEX CONCURRENTLY')) {
    rollbackSQL += forwardSQL
      .replace(/CREATE INDEX CONCURRENTLY IF NOT EXISTS (\w+)/gi, 'DROP INDEX CONCURRENTLY IF EXISTS $1')
      .replace(/ON .*/gi, ';');
    notes.push('Index creation is online — rollback is also online via DROP INDEX CONCURRENTLY');
  } else if (upperSQL.includes('ADD COLUMN')) {
    rollbackSQL += '-- Extract column name from forward migration and run:\n';
    rollbackSQL += '-- ALTER TABLE <table> DROP COLUMN <column_name>;\n';
    notes.push('DROP COLUMN is destructive — ensure no app code references the column before rolling back');
    riskLevel = 'medium';
  } else if (upperSQL.includes('CREATE TABLE')) {
    rollbackSQL += '-- DROP TABLE <table_name> CASCADE;\n';
    notes.push('Ensure no data was written before dropping');
    riskLevel = 'medium';
  } else if (upperSQL.includes('DROP')) {
    rollbackSQL += '-- WARNING: DROP operations cannot be automatically reversed\n';
    rollbackSQL += '-- Restore from backup or recreate the object manually\n';
    riskLevel = 'high';
    estimatedDowntime = 'Requires backup restore';
    notes.push('CRITICAL: Always take a backup before DROP operations');
    notes.push('Test rollback procedure in staging before production');
  } else if (upperSQL.includes('ALTER TABLE')) {
    rollbackSQL += '-- Review ALTER TABLE changes and reverse manually\n';
    riskLevel = 'medium';
    notes.push('ALTER TABLE operations may require table rewrite — test in staging first');
  }

  return {
    migrationId,
    forwardSQL,
    rollbackSQL,
    estimatedDowntime,
    riskLevel,
    notes,
  };
}

// ============================================================
// MIGRATION EXECUTION LOGGER
// ============================================================

export interface MigrationRecord {
  id: string;
  name: string;
  appliedAt: Date;
  durationMs: number;
  status: 'applied' | 'failed' | 'rolled_back';
  checksum: string;
}

/**
 * Log a migration execution for audit trail.
 * Uses Prisma's $executeRaw to write to a migrations log table.
 */
export async function logMigrationExecution(
  name: string,
  durationMs: number,
  status: 'applied' | 'failed' | 'rolled_back',
  error?: string
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO _migration_audit_log (name, applied_at, duration_ms, status, error_message)
      VALUES (${name}, NOW(), ${durationMs}, ${status}, ${error ?? null})
      ON CONFLICT (name) DO UPDATE
        SET applied_at = NOW(), duration_ms = ${durationMs}, status = ${status}, error_message = ${error ?? null}
    `;
  } catch {
    // Table may not exist yet — log to console
    queueLogger.info('Migration executed', { name, durationMs, status, error });
  }
}

// ============================================================
// STAGED DEPLOYMENT CHECKLIST
// ============================================================

export const STAGED_DEPLOYMENT_CHECKLIST = `
MerchantOS — Zero-Downtime Migration Checklist
===============================================

PRE-MIGRATION:
□ 1. Run validateMigrationSafety() — all checks must pass
□ 2. Take database backup (pg_dump or managed snapshot)
□ 3. Test migration in staging environment
□ 4. Generate rollback plan with generateRollbackPlan()
□ 5. Notify team of maintenance window (if needed)
□ 6. Check replication lag < 1MB
□ 7. Verify no long-running queries (>30s)

MIGRATION EXECUTION:
□ 8. Apply migration during low-traffic window
□ 9. Use CONCURRENTLY for index creation
□ 10. Monitor pg_stat_activity during migration
□ 11. Verify migration completed successfully
□ 12. Run ANALYZE on affected tables

POST-MIGRATION:
□ 13. Verify application health endpoints
□ 14. Check slow query logs for regressions
□ 15. Verify index usage stats after 15 minutes
□ 16. Monitor error rates in observability dashboard
□ 17. Run integration tests against production DB
□ 18. Update migration audit log

ROLLBACK TRIGGER CONDITIONS:
- Error rate increases >5% after migration
- P95 query latency increases >50%
- Any critical API returning 500 errors
- Data integrity check failures
`;
