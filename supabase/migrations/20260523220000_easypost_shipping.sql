-- EasyPost Shipping Integration
-- Creates Shipment and TrackingEvent tables for EasyPost label + tracking pipeline

-- Create Shipment table (matches Prisma model Shipment)
CREATE TABLE IF NOT EXISTS public."Shipment" (
  "id"                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "orderId"              TEXT        NOT NULL,
  "carrier"              TEXT,
  "trackingNumber"       TEXT,
  "trackingUrl"          TEXT,
  "status"               TEXT        NOT NULL DEFAULT 'pending',
  "shippedAt"            TIMESTAMPTZ,
  "deliveredAt"          TIMESTAMPTZ,
  "easypostShipmentId"   TEXT,
  "easypostTrackerId"    TEXT,
  "labelUrl"             TEXT,
  "service"              TEXT,
  "rateAmount"           DECIMAL(10, 2),
  "labelCreatedAt"       TIMESTAMPTZ,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- Indexes for Shipment
CREATE INDEX IF NOT EXISTS "Shipment_orderId_idx"           ON public."Shipment"("orderId");
CREATE INDEX IF NOT EXISTS "Shipment_trackingNumber_idx"    ON public."Shipment"("trackingNumber");
CREATE INDEX IF NOT EXISTS "Shipment_easypostShipmentId_idx" ON public."Shipment"("easypostShipmentId");

-- Create TrackingEvent table (matches Prisma model TrackingEvent)
CREATE TABLE IF NOT EXISTS public."TrackingEvent" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "shipmentId"       TEXT        NOT NULL,
  "easypostEventId"  TEXT,
  "status"           TEXT        NOT NULL,
  "message"          TEXT,
  "location"         TEXT,
  "carrier"          TEXT,
  "eventTime"        TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes for TrackingEvent
CREATE INDEX IF NOT EXISTS "TrackingEvent_shipmentId_idx"      ON public."TrackingEvent"("shipmentId");
CREATE INDEX IF NOT EXISTS "TrackingEvent_easypostEventId_idx" ON public."TrackingEvent"("easypostEventId");

-- Foreign key: TrackingEvent → Shipment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'TrackingEvent_shipmentId_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public."TrackingEvent"
      ADD CONSTRAINT "TrackingEvent_shipmentId_fkey"
      FOREIGN KEY ("shipmentId") REFERENCES public."Shipment"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public."Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TrackingEvent" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Shipment
DROP POLICY IF EXISTS "service_role_shipment_all" ON public."Shipment";
CREATE POLICY "service_role_shipment_all"
  ON public."Shipment"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_shipment_read" ON public."Shipment";
CREATE POLICY "authenticated_shipment_read"
  ON public."Shipment"
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for TrackingEvent
DROP POLICY IF EXISTS "service_role_tracking_event_all" ON public."TrackingEvent";
CREATE POLICY "service_role_tracking_event_all"
  ON public."TrackingEvent"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_tracking_event_read" ON public."TrackingEvent";
CREATE POLICY "authenticated_tracking_event_read"
  ON public."TrackingEvent"
  FOR SELECT
  TO authenticated
  USING (true);
