-- ============================================================
-- MerchantOS — Performance Indexes Migration
-- Run: psql $DATABASE_URL -f prisma/migrations/001_performance_indexes.sql
-- Safe to re-run (uses IF NOT EXISTS / CREATE INDEX CONCURRENTLY)
-- ============================================================

-- ============================================================
-- ORDERS — composite + selective indexes
-- ============================================================

-- Composite: tenant-scoped time-series queries (dashboard, reporting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_created
  ON "Order" ("storeId", "createdAt" DESC);

-- Composite: tenant + status filtering (order management)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_status
  ON "Order" ("storeId", "status");

-- Composite: tenant + customer (customer order history)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_customer
  ON "Order" ("storeId", "customerId");

-- Stripe payment intent lookup (webhook processing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_stripe_payment_intent
  ON "Order" ("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;

-- Payment status + tenant (financial queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_payment_status
  ON "Order" ("storeId", "paymentStatus");

-- ============================================================
-- CUSTOMERS — composite indexes
-- ============================================================

-- Composite: tenant + email (login, dedup, lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_email
  ON "Customer" ("storeId", "email");

-- Composite: tenant + created (new customer reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_created
  ON "Customer" ("storeId", "createdAt");

-- Composite: tenant + last order (churn detection, LTV)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_last_order
  ON "Customer" ("storeId", "lastOrderAt")
  WHERE "lastOrderAt" IS NOT NULL;

-- Status filtering per tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_status
  ON "Customer" ("storeId", "status");

-- ============================================================
-- PRODUCTS — composite indexes
-- ============================================================

-- Composite: tenant + updated (sync, cache invalidation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_updated
  ON "Product" ("storeId", "updatedAt" DESC);

-- Composite: tenant + SKU (inventory lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_sku
  ON "Product" ("storeId", "sku")
  WHERE "sku" IS NOT NULL;

-- Composite: tenant + status (storefront rendering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_status
  ON "Product" ("storeId", "status");

-- ============================================================
-- SUBSCRIPTIONS — selective indexes
-- ============================================================

-- Tenant + status (MRR calculations, dunning)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_tenant_status
  ON "Subscription" ("storeId", "status")
  WHERE "storeId" IS NOT NULL;

-- Stripe subscription ID (webhook processing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_id
  ON "Subscription" ("stripeSubscriptionId")
  WHERE "stripeSubscriptionId" IS NOT NULL;

-- Next billing date (renewal jobs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_next_billing
  ON "Subscription" ("nextBillingAt")
  WHERE "nextBillingAt" IS NOT NULL AND "status" = 'active';

-- ============================================================
-- AFFILIATES — composite indexes
-- ============================================================

-- Tenant + affiliate ID (GoAffPro sync)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliates_tenant_goaffpro
  ON "Affiliate" ("storeId", "goaffproAffiliateId")
  WHERE "goaffproAffiliateId" IS NOT NULL;

-- Tenant + status (dashboard queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliates_tenant_status
  ON "Affiliate" ("storeId", "status");

-- Referral code lookup (checkout attribution)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliates_referral_code
  ON "Affiliate" ("referralCode");

-- ============================================================
-- ANALYTICS EVENTS — time-series optimized
-- ============================================================

-- Composite: tenant + event type + time (analytics queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_tenant_type_created
  ON "AnalyticsEvent" ("storeId", "eventType", "createdAt" DESC);

-- Tenant + time only (time-range scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_tenant_created
  ON "AnalyticsEvent" ("storeId", "createdAt" DESC);

-- Session tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_session
  ON "AnalyticsEvent" ("sessionId")
  WHERE "sessionId" IS NOT NULL;

-- ============================================================
-- WEBHOOK EVENTS — idempotency + processing
-- ============================================================

-- Provider + event ID (idempotency dedup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_provider_event
  ON "WebhookEvent" ("source", "eventId")
  WHERE "eventId" IS NOT NULL;

-- Tenant + processed time (observability queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_tenant_processed
  ON "WebhookEvent" ("tenantId", "processedAt")
  WHERE "tenantId" IS NOT NULL;

-- Status + retry scheduling
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_status_retry
  ON "WebhookEvent" ("status", "nextRetryAt")
  WHERE "status" IN ('pending', 'failed');

-- Dead letter queue queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_dead_lettered
  ON "WebhookEvent" ("deadLettered", "createdAt" DESC)
  WHERE "deadLettered" = true;

-- Unique constraint on provider + eventId (prevent duplicates)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_unique_provider_event
  ON "WebhookEvent" ("source", "eventId")
  WHERE "eventId" IS NOT NULL;

-- ============================================================
-- BACKGROUND JOBS — queue processing
-- ============================================================

-- Queue + status + scheduled (job processor)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_queue_status_scheduled
  ON "BackgroundJob" ("queue", "status", "scheduledAt")
  WHERE "status" IN ('pending', 'retrying');

-- ============================================================
-- FULL-TEXT SEARCH — ts_vector indexes
-- ============================================================

-- Orders: full-text on order number + customer name
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("orderNumber", '') || ' '
    )
  ) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_fts
  ON "Order" USING GIN (search_vector);

-- Customers: full-text on name + email
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("name", '') || ' ' ||
      coalesce("email", '') || ' ' ||
      coalesce("firstName", '') || ' ' ||
      coalesce("lastName", '')
    )
  ) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_fts
  ON "Customer" USING GIN (search_vector);

-- Products: full-text on name + description + SKU (weighted)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("sku", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'C')
  ) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_fts
  ON "Product" USING GIN (search_vector);

-- ============================================================
-- ANALYZE — update planner statistics
-- ============================================================

ANALYZE "Order";
ANALYZE "Customer";
ANALYZE "Product";
ANALYZE "Subscription";
ANALYZE "Affiliate";
ANALYZE "AnalyticsEvent";
ANALYZE "WebhookEvent";
ANALYZE "BackgroundJob";
