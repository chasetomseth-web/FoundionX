-- Coupons table for discount code management with Stripe sync
CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
  value           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  usage_limit     INTEGER,
  minimum_order   NUMERIC(10, 2),
  expires_at      TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  revenue         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stripe_coupon_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons (status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_coupons_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_coupons_updated_at();

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'coupons_all'
  ) THEN
    CREATE POLICY coupons_all ON public.coupons
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed a few example coupons
INSERT INTO public.coupons (code, type, value, usage_count, usage_limit, status, expires_at, minimum_order, revenue)
VALUES
  ('LAUNCH20',    'percentage',    20, 142, 500, 'active',   '2026-06-30T23:59:59Z', 50,  18420),
  ('SAVE30',      'fixed',         30,  89, 200, 'active',   '2026-12-31T23:59:59Z', 100, 12400),
  ('FREESHIP',    'free_shipping',  0, 312, NULL,'active',   NULL,                   75,  0),
  ('FLASH50',     'percentage',    50, 500, 500, 'expired',  '2026-05-15T23:59:59Z', NULL,24800),
  ('AFFILIATE10', 'percentage',    10, 198, NULL,'active',   NULL,                   NULL,8900)
ON CONFLICT (code) DO NOTHING;
