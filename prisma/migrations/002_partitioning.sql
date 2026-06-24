-- ============================================================
-- MerchantOS — Table Partitioning Strategy
-- IMPORTANT: Partitioning requires table recreation.
-- Run this in a maintenance window or use pg_partman for live migration.
-- This script creates partitioned shadow tables + migration path.
-- ============================================================

-- ============================================================
-- ORDERS — Monthly range partitioning by createdAt
-- ============================================================

-- Step 1: Create partitioned orders archive table
CREATE TABLE IF NOT EXISTS "OrderPartitioned" (
  LIKE "Order" INCLUDING ALL
) PARTITION BY RANGE ("createdAt");

-- Step 2: Create monthly partitions (current + next 12 months)
-- Pattern: orders_YYYY_MM

DO $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date     TEXT;
  end_date       TEXT;
BEGIN
  FOR i IN 0..13 LOOP
    partition_date := DATE_TRUNC('month', NOW()) + (i || ' months')::INTERVAL;
    partition_name := 'orders_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date     := TO_CHAR(partition_date, 'YYYY-MM-DD');
    end_date       := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = partition_name AND n.nspname = 'public'
    ) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF "OrderPartitioned"
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
      RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
  END LOOP;
END $$;

-- Step 3: Default partition for out-of-range data
CREATE TABLE IF NOT EXISTS orders_default
  PARTITION OF "OrderPartitioned" DEFAULT;

-- Step 4: Indexes on partitioned table (inherited by all partitions)
CREATE INDEX IF NOT EXISTS idx_orders_part_tenant_created
  ON "OrderPartitioned" ("storeId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_orders_part_tenant_status
  ON "OrderPartitioned" ("storeId", "status");

CREATE INDEX IF NOT EXISTS idx_orders_part_stripe_pi
  ON "OrderPartitioned" ("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;

-- ============================================================
-- ANALYTICS EVENTS — Weekly range partitioning by createdAt
-- ============================================================

CREATE TABLE IF NOT EXISTS "AnalyticsEventPartitioned" (
  LIKE "AnalyticsEvent" INCLUDING ALL
) PARTITION BY RANGE ("createdAt");

-- Create weekly partitions for current + next 8 weeks
DO $$
DECLARE
  week_start DATE;
  week_end   DATE;
  part_name  TEXT;
BEGIN
  FOR i IN 0..9 LOOP
    week_start := DATE_TRUNC('week', NOW()) + (i || ' weeks')::INTERVAL;
    week_end   := week_start + INTERVAL '1 week';
    part_name  := 'analytics_events_' || TO_CHAR(week_start, 'YYYY_WW');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = part_name AND n.nspname = 'public'
    ) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF "AnalyticsEventPartitioned"
         FOR VALUES FROM (%L) TO (%L)',
        part_name, week_start::TEXT, week_end::TEXT
      );
      RAISE NOTICE 'Created analytics partition: %', part_name;
    END IF;
  END LOOP;
END $$;

-- Default partition
CREATE TABLE IF NOT EXISTS analytics_events_default
  PARTITION OF "AnalyticsEventPartitioned" DEFAULT;

-- Indexes on partitioned analytics table
CREATE INDEX IF NOT EXISTS idx_analytics_part_tenant_type_created
  ON "AnalyticsEventPartitioned" ("storeId", "eventType", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_part_tenant_created
  ON "AnalyticsEventPartitioned" ("storeId", "createdAt" DESC);

-- ============================================================
-- WEBHOOK EVENTS — Monthly partitioning by createdAt
-- ============================================================

CREATE TABLE IF NOT EXISTS "WebhookEventPartitioned" (
  LIKE "WebhookEvent" INCLUDING ALL
) PARTITION BY RANGE ("createdAt");

DO $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date     TEXT;
  end_date       TEXT;
BEGIN
  FOR i IN 0..6 LOOP
    partition_date := DATE_TRUNC('month', NOW()) + (i || ' months')::INTERVAL;
    partition_name := 'webhook_events_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date     := TO_CHAR(partition_date, 'YYYY-MM-DD');
    end_date       := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = partition_name AND n.nspname = 'public'
    ) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF "WebhookEventPartitioned"
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS webhook_events_default
  PARTITION OF "WebhookEventPartitioned" DEFAULT;

-- Indexes on partitioned webhook table
CREATE INDEX IF NOT EXISTS idx_webhook_part_provider_event
  ON "WebhookEventPartitioned" ("source", "eventId")
  WHERE "eventId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_part_tenant_processed
  ON "WebhookEventPartitioned" ("tenantId", "processedAt")
  WHERE "tenantId" IS NOT NULL;

-- ============================================================
-- PARTITION MAINTENANCE FUNCTION
-- Creates next month's partitions automatically (run via cron)
-- ============================================================

CREATE OR REPLACE FUNCTION create_next_month_partitions()
RETURNS void AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  next_end   DATE := next_month + INTERVAL '1 month';
  order_part TEXT := 'orders_' || TO_CHAR(next_month, 'YYYY_MM');
  webhook_part TEXT := 'webhook_events_' || TO_CHAR(next_month, 'YYYY_MM');
BEGIN
  -- Orders partition
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = order_part) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF "OrderPartitioned" FOR VALUES FROM (%L) TO (%L)',
      order_part, next_month::TEXT, next_end::TEXT
    );
  END IF;

  -- Webhook partition
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = webhook_part) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF "WebhookEventPartitioned" FOR VALUES FROM (%L) TO (%L)',
      webhook_part, next_month::TEXT, next_end::TEXT
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ARCHIVAL FUNCTION — drop old partitions (>6 months)
-- ============================================================

CREATE OR REPLACE FUNCTION archive_old_partitions(months_to_keep INT DEFAULT 6)
RETURNS void AS $$
DECLARE
  cutoff_date DATE := DATE_TRUNC('month', NOW() - (months_to_keep || ' months')::INTERVAL);
  part_name   TEXT;
BEGIN
  FOR part_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname ~ '^orders_\d{4}_\d{2}$'
      AND TO_DATE(REGEXP_REPLACE(c.relname, '^orders_', ''), 'YYYY_MM') < cutoff_date
  LOOP
    RAISE NOTICE 'Archiving partition: %', part_name;
    -- Detach first (keeps data accessible), then drop
    EXECUTE format('ALTER TABLE "OrderPartitioned" DETACH PARTITION %I', part_name);
    -- Optionally: EXECUTE format('DROP TABLE %I', part_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
