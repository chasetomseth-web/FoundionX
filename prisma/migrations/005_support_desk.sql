-- Support Desk: tickets, messages, tags
-- NOTE: This is raw SQL so we don't depend on Prisma migration engine details.
-- Run via `prisma migrate dev` or `prisma db push`.

BEGIN;

-- Tickets
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "customerName" TEXT,
  "customerEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open', -- open | pending | resolved
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_idx" ON "SupportTicket"("organizationId");
CREATE INDEX IF NOT EXISTS "SupportTicket_customerEmail_idx" ON "SupportTicket"("customerEmail");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_updatedAt_idx" ON "SupportTicket"("updatedAt");

-- Messages
CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL, -- customer | agent
  "senderEmail" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");

-- Tags
CREATE TABLE IF NOT EXISTS "SupportTag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SupportTag_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "SupportTag_ticketId_idx" ON "SupportTag"("ticketId");
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTag_ticketId_tag_unique" ON "SupportTag"("ticketId", "tag");

-- Basic updatedAt trigger
CREATE OR REPLACE FUNCTION "set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "SupportTicket_set_updated_at" ON "SupportTicket";
CREATE TRIGGER "SupportTicket_set_updated_at"
BEFORE UPDATE ON "SupportTicket"
FOR EACH ROW
EXECUTE FUNCTION "set_updated_at"();

COMMIT;

