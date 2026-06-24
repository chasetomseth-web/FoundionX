-- Integration settings table to persist API credentials across sessions
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  credentials JSONB NOT NULL DEFAULT '{}',
  connected BOOLEAN NOT NULL DEFAULT false,
  details TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integration_settings_provider ON public.integration_settings(provider);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integration_settings_open_access" ON public.integration_settings;
CREATE POLICY "integration_settings_open_access"
  ON public.integration_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
