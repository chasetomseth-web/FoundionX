-- ============================================================
-- MerchantOS — Migration Audit Log Table
-- Tracks all schema migrations for audit trail and rollback safety
-- ============================================================

CREATE TABLE IF NOT EXISTS _migration_audit_log (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL UNIQUE,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms   INTEGER,
  status        VARCHAR(20) NOT NULL DEFAULT 'applied', -- applied | failed | rolled_back
  error_message TEXT,
  applied_by    VARCHAR(255) DEFAULT 'system',
  checksum      VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_migration_audit_applied_at
  ON _migration_audit_log (applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_migration_audit_status
  ON _migration_audit_log (status);

-- ============================================================
-- RLS READINESS — Session variable setup
-- ============================================================

-- Create a function to safely get current tenant (returns NULL if not set)
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- QUERY TIMEOUT ENFORCEMENT
-- ============================================================

-- Set statement timeout for application role (prevents runaway queries)
-- Replace 'app_user' with your actual DB user
-- ALTER ROLE app_user SET statement_timeout = '30s';
-- ALTER ROLE app_user SET lock_timeout = '10s';
-- ALTER ROLE app_user SET idle_in_transaction_session_timeout = '60s';

-- ============================================================
-- ENABLE pg_stat_statements (run as superuser)
-- ============================================================

-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
-- SELECT pg_reload_conf();

-- ============================================================
-- PARTITION MAINTENANCE CRON (pg_cron extension)
-- ============================================================

-- Requires pg_cron extension:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('create-monthly-partitions', '0 0 25 * *', 'SELECT create_next_month_partitions()');
-- SELECT cron.schedule('refresh-analytics-views', '*/15 * * * *', 'SELECT refresh_analytics_views()');
-- SELECT cron.schedule('archive-old-partitions', '0 2 1 * *', 'SELECT archive_old_partitions(6)');

COMMENT ON TABLE _migration_audit_log IS 'Tracks all schema migrations for audit trail and rollback safety';
