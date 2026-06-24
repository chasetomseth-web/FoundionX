-- ============================================================
-- Upsell Funnel Engine Migration
-- ============================================================

-- Step types enum
DROP TYPE IF EXISTS public.funnel_step_type CASCADE;
CREATE TYPE public.funnel_step_type AS ENUM ('upsell', 'downsell', 'cross_sell', 'order_bump');

-- Upsell session status enum
DROP TYPE IF EXISTS public.upsell_session_status CASCADE;
CREATE TYPE public.upsell_session_status AS ENUM ('active', 'completed', 'expired');

-- Upsell charge status enum
DROP TYPE IF EXISTS public.upsell_charge_status CASCADE;
CREATE TYPE public.upsell_charge_status AS ENUM ('pending', 'succeeded', 'failed', 'declined');

-- ── Funnels ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.upsell_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_product_id TEXT, -- Stripe product ID that triggers this funnel
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── Funnel Steps ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.funnel_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.upsell_funnels(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type public.funnel_step_type NOT NULL DEFAULT 'upsell',
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0, -- price in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  html_content TEXT, -- custom HTML for the offer page
  -- If user declines this step, which step_order to jump to (NULL = end funnel)
  decline_next_step_order INTEGER,
  -- If user accepts this step, which step_order to jump to (NULL = end funnel)
  accept_next_step_order INTEGER,
  stripe_price_id TEXT, -- optional pre-created Stripe price
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── Upsell Sessions ───────────────────────────────────────────────────────────
-- Created after checkout.session.completed, tracks user progress through funnel
CREATE TABLE IF NOT EXISTS public.upsell_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  funnel_id UUID REFERENCES public.upsell_funnels(id) ON DELETE SET NULL,
  current_step_order INTEGER DEFAULT 1,
  status public.upsell_session_status DEFAULT 'active',
  accepted_step_orders INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  declined_step_orders INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  customer_email TEXT,
  original_order_amount INTEGER, -- cents
  total_upsell_revenue INTEGER DEFAULT 0, -- cents
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours')
);

-- ── Upsell Charges ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.upsell_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upsell_session_id UUID NOT NULL REFERENCES public.upsell_sessions(id) ON DELETE CASCADE,
  funnel_step_id UUID NOT NULL REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.upsell_charge_status DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel_id ON public.funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_steps_order ON public.funnel_steps(funnel_id, step_order);
CREATE INDEX IF NOT EXISTS idx_upsell_sessions_checkout ON public.upsell_sessions(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_upsell_sessions_customer ON public.upsell_sessions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_upsell_charges_session ON public.upsell_charges(upsell_session_id);

-- ── Updated_at trigger function ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_upsell_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upsell_funnels_updated_at ON public.upsell_funnels;
CREATE TRIGGER trg_upsell_funnels_updated_at
  BEFORE UPDATE ON public.upsell_funnels
  FOR EACH ROW EXECUTE FUNCTION public.update_upsell_updated_at();

DROP TRIGGER IF EXISTS trg_funnel_steps_updated_at ON public.funnel_steps;
CREATE TRIGGER trg_funnel_steps_updated_at
  BEFORE UPDATE ON public.funnel_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_upsell_updated_at();

DROP TRIGGER IF EXISTS trg_upsell_sessions_updated_at ON public.upsell_sessions;
CREATE TRIGGER trg_upsell_sessions_updated_at
  BEFORE UPDATE ON public.upsell_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_upsell_updated_at();

DROP TRIGGER IF EXISTS trg_upsell_charges_updated_at ON public.upsell_charges;
CREATE TRIGGER trg_upsell_charges_updated_at
  BEFORE UPDATE ON public.upsell_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_upsell_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.upsell_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_charges ENABLE ROW LEVEL SECURITY;

-- Open access for authenticated (merchant dashboard) and service role (API routes)
DROP POLICY IF EXISTS "authenticated_manage_upsell_funnels" ON public.upsell_funnels;
CREATE POLICY "authenticated_manage_upsell_funnels" ON public.upsell_funnels
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_manage_upsell_funnels" ON public.upsell_funnels;
CREATE POLICY "service_manage_upsell_funnels" ON public.upsell_funnels
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_funnel_steps" ON public.funnel_steps;
CREATE POLICY "authenticated_manage_funnel_steps" ON public.funnel_steps
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_manage_funnel_steps" ON public.funnel_steps;
CREATE POLICY "service_manage_funnel_steps" ON public.funnel_steps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_upsell_sessions" ON public.upsell_sessions;
CREATE POLICY "authenticated_manage_upsell_sessions" ON public.upsell_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_manage_upsell_sessions" ON public.upsell_sessions;
CREATE POLICY "service_manage_upsell_sessions" ON public.upsell_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_upsell_charges" ON public.upsell_charges;
CREATE POLICY "authenticated_manage_upsell_charges" ON public.upsell_charges
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_manage_upsell_charges" ON public.upsell_charges;
CREATE POLICY "service_manage_upsell_charges" ON public.upsell_charges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read for upsell session (needed by upsell flow page — no auth)
DROP POLICY IF EXISTS "public_read_upsell_sessions" ON public.upsell_sessions;
CREATE POLICY "public_read_upsell_sessions" ON public.upsell_sessions
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public_read_funnel_steps" ON public.funnel_steps;
CREATE POLICY "public_read_funnel_steps" ON public.funnel_steps
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public_read_upsell_funnels" ON public.upsell_funnels;
CREATE POLICY "public_read_upsell_funnels" ON public.upsell_funnels
  FOR SELECT TO anon USING (true);
