DO $$
BEGIN
  CREATE TYPE saleseeker_job_status AS ENUM ('pending', 'running', 'done', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS saleseeker_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  niche TEXT NOT NULL,
  place_id TEXT,
  rating DOUBLE PRECISION,
  reviews INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saleseeker_businesses_place_id_key
  ON saleseeker_businesses (place_id);

CREATE INDEX IF NOT EXISTS idx_saleseeker_businesses_geo_niche
  ON saleseeker_businesses (niche, city, state, country);

CREATE TABLE IF NOT EXISTS saleseeker_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saleseeker_campaigns_niche
  ON saleseeker_campaigns (niche);

CREATE TABLE IF NOT EXISTS saleseeker_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES saleseeker_businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  owner_name TEXT,
  source_url TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  campaign_id UUID REFERENCES saleseeker_campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saleseeker_leads_business_email_key
  ON saleseeker_leads (business_id, email);

CREATE INDEX IF NOT EXISTS idx_saleseeker_leads_campaign
  ON saleseeker_leads (campaign_id);

CREATE TABLE IF NOT EXISTS saleseeker_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status saleseeker_job_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saleseeker_jobs_status_created
  ON saleseeker_jobs (status, created_at);
