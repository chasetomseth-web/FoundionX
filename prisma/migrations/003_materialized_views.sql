-- ============================================================
-- MerchantOS — Materialized Views for Analytics KPIs
-- Refresh strategy: scheduled via BullMQ pre-aggregation jobs
-- ============================================================

-- ============================================================
-- DAILY REVENUE SUMMARY (per tenant)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
SELECT
  o."storeId"                                    AS tenant_id,
  DATE_TRUNC('day', o."createdAt")::DATE         AS revenue_date,
  COUNT(*)                                        AS order_count,
  SUM(o."total")                                  AS gross_revenue,
  SUM(o."total" - o."refundedAmount")             AS net_revenue,
  SUM(o."refundedAmount")                         AS total_refunds,
  AVG(o."total")                                  AS avg_order_value,
  COUNT(DISTINCT o."customerId")                  AS unique_customers
FROM "Order" o
WHERE o."paymentStatus" = 'paid'
GROUP BY o."storeId", DATE_TRUNC('day', o."createdAt")::DATE
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue_pk
  ON mv_daily_revenue (tenant_id, revenue_date);

CREATE INDEX IF NOT EXISTS idx_mv_daily_revenue_tenant
  ON mv_daily_revenue (tenant_id, revenue_date DESC);

-- ============================================================
-- MONTHLY GMV SUMMARY (per tenant)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_gmv AS
SELECT
  o."storeId"                                    AS tenant_id,
  DATE_TRUNC('month', o."createdAt")::DATE       AS month,
  COUNT(*)                                        AS order_count,
  SUM(o."total")                                  AS gmv,
  SUM(o."total" - o."refundedAmount")             AS net_gmv,
  AVG(o."total")                                  AS avg_order_value,
  COUNT(DISTINCT o."customerId")                  AS unique_buyers,
  SUM(o."discountTotal")                          AS total_discounts
FROM "Order" o
WHERE o."paymentStatus" = 'paid'
GROUP BY o."storeId", DATE_TRUNC('month', o."createdAt")::DATE
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_gmv_pk
  ON mv_monthly_gmv (tenant_id, month);

-- ============================================================
-- MRR (Monthly Recurring Revenue) per tenant
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_mrr AS
SELECT
  s."storeId"                                    AS tenant_id,
  DATE_TRUNC('month', NOW())::DATE               AS snapshot_month,
  COUNT(*) FILTER (WHERE s."status" = 'active')  AS active_subscriptions,
  SUM(
    CASE
      WHEN s."interval" = 'month' THEN s."amount"
      WHEN s."interval" = 'year'  THEN s."amount" / 12
      WHEN s."interval" = 'week'  THEN s."amount" * 4.33
      ELSE s."amount"
    END
  ) FILTER (WHERE s."status" = 'active')         AS mrr,
  SUM(
    CASE
      WHEN s."interval" = 'month' THEN s."amount" * 12
      WHEN s."interval" = 'year'  THEN s."amount"
      WHEN s."interval" = 'week'  THEN s."amount" * 52
      ELSE s."amount" * 12
    END
  ) FILTER (WHERE s."status" = 'active')         AS arr,
  COUNT(*) FILTER (WHERE s."status" = 'past_due') AS past_due_count,
  COUNT(*) FILTER (WHERE s."status" = 'canceled') AS churned_count
FROM "Subscription" s
WHERE s."storeId" IS NOT NULL
GROUP BY s."storeId"
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_mrr_pk
  ON mv_mrr (tenant_id);

-- ============================================================
-- CONVERSION FUNNEL RATES (per tenant, rolling 30 days)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_conversion_rates AS
WITH funnel AS (
  SELECT
    ae."storeId"                                  AS tenant_id,
    COUNT(*) FILTER (WHERE ae."eventType" = 'page_view')       AS page_views,
    COUNT(*) FILTER (WHERE ae."eventType" = 'add_to_cart')     AS add_to_carts,
    COUNT(*) FILTER (WHERE ae."eventType" = 'checkout_start')  AS checkout_starts,
    COUNT(*) FILTER (WHERE ae."eventType" = 'purchase')        AS purchases
  FROM "AnalyticsEvent" ae
  WHERE ae."createdAt" >= NOW() - INTERVAL '30 days'
  GROUP BY ae."storeId"
)
SELECT
  tenant_id,
  page_views,
  add_to_carts,
  checkout_starts,
  purchases,
  CASE WHEN page_views > 0
    THEN ROUND((add_to_carts::NUMERIC / page_views) * 100, 2)
    ELSE 0 END                                    AS cart_rate,
  CASE WHEN add_to_carts > 0
    THEN ROUND((checkout_starts::NUMERIC / add_to_carts) * 100, 2)
    ELSE 0 END                                    AS checkout_rate,
  CASE WHEN checkout_starts > 0
    THEN ROUND((purchases::NUMERIC / checkout_starts) * 100, 2)
    ELSE 0 END                                    AS purchase_rate,
  CASE WHEN page_views > 0
    THEN ROUND((purchases::NUMERIC / page_views) * 100, 2)
    ELSE 0 END                                    AS overall_conversion_rate
FROM funnel
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_conversion_pk
  ON mv_conversion_rates (tenant_id);

-- ============================================================
-- CUSTOMER LTV (per tenant)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_ltv AS
SELECT
  c."storeId"                                    AS tenant_id,
  COUNT(*)                                        AS total_customers,
  AVG(c."ltv")                                    AS avg_ltv,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY c."ltv") AS median_ltv,
  MAX(c."ltv")                                    AS max_ltv,
  AVG(c."totalOrders")                            AS avg_orders_per_customer,
  AVG(c."avgOrderValue")                          AS avg_order_value,
  COUNT(*) FILTER (WHERE c."status" = 'active')   AS active_customers,
  COUNT(*) FILTER (WHERE c."status" = 'churned')  AS churned_customers,
  COUNT(*) FILTER (WHERE c."createdAt" >= NOW() - INTERVAL '30 days') AS new_customers_30d
FROM "Customer" c
GROUP BY c."storeId"
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ltv_pk
  ON mv_customer_ltv (tenant_id);

-- ============================================================
-- AFFILIATE PERFORMANCE SUMMARY (per tenant)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_affiliate_performance AS
SELECT
  a."storeId"                                    AS tenant_id,
  COUNT(*)                                        AS total_affiliates,
  COUNT(*) FILTER (WHERE a."status" = 'active')  AS active_affiliates,
  SUM(a."totalEarned")                            AS total_commissions_paid,
  SUM(a."pendingBalance")                         AS total_pending_balance,
  SUM(a."totalReferrals")                         AS total_referrals,
  SUM(a."totalConversions")                       AS total_conversions,
  CASE WHEN SUM(a."totalReferrals") > 0
    THEN ROUND((SUM(a."totalConversions")::NUMERIC / SUM(a."totalReferrals")) * 100, 2)
    ELSE 0 END                                    AS affiliate_conversion_rate
FROM "Affiliate" a
GROUP BY a."storeId"
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_affiliate_pk
  ON mv_affiliate_performance (tenant_id);

-- ============================================================
-- REFRESH FUNCTION — called by pre-aggregation jobs
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_gmv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mrr;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversion_rates;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_ltv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_affiliate_performance;
  RAISE NOTICE 'All analytics materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Initial population
SELECT refresh_analytics_views();
