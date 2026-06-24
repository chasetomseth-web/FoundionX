-- ============================================================
-- PAGEBUILDER CMS — Phase 1 Schema Foundation
-- Adds all new models alongside existing MerchantPage system
-- ============================================================

-- ============================================================
-- PAGE — Standalone content pages (About, Contact, FAQ, Blog, etc.)
-- ============================================================
CREATE TABLE "Page" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'page',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibility" JSONB NOT NULL DEFAULT '{"rule":"everyone"}',
    "html" TEXT NOT NULL DEFAULT '',
    "css" TEXT,
    "js" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "settings" JSONB DEFAULT '{}',
    "publishedHtml" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Page_storeId_idx" ON "Page"("storeId");
CREATE INDEX "Page_slug_idx" ON "Page"("slug");
CREATE UNIQUE INDEX "Page_storeId_slug_key" ON "Page"("storeId", "slug");

-- ============================================================
-- PAGE VERSION — Version history for standalone Pages
-- ============================================================
CREATE TABLE "PageVersion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "html" TEXT NOT NULL DEFAULT '',
    "css" TEXT,
    "js" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageVersion_pageId_idx" ON "PageVersion"("pageId");
CREATE UNIQUE INDEX "PageVersion_pageId_version_key" ON "PageVersion"("pageId", "version");

-- ============================================================
-- TEMPLATE — Reusable funnel page templates
-- (Homepage, Product, Checkout, Upsell, Downsell, Thank You, etc.)
-- ============================================================
CREATE TABLE "Template" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "html" TEXT NOT NULL DEFAULT '',
    "css" TEXT,
    "js" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "settings" JSONB DEFAULT '{}',
    "publishedHtml" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Template_storeId_idx" ON "Template"("storeId");
CREATE INDEX "Template_type_idx" ON "Template"("type");
CREATE UNIQUE INDEX "Template_storeId_slug_key" ON "Template"("storeId", "slug");

-- ============================================================
-- TEMPLATE VERSION — Version history for Templates
-- ============================================================
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "html" TEXT NOT NULL DEFAULT '',
    "css" TEXT,
    "js" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TemplateVersion_templateId_idx" ON "TemplateVersion"("templateId");
CREATE UNIQUE INDEX "TemplateVersion_templateId_version_key" ON "TemplateVersion"("templateId", "version");

-- ============================================================
-- UPDATE FUNNELSTEP — Add templateId, routeType, declineStepId
-- ============================================================
-- Add new columns to FunnelStep (existing table)
ALTER TABLE "FunnelStep" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "FunnelStep" ADD COLUMN IF NOT EXISTS "routeType" TEXT NOT NULL DEFAULT 'page';
ALTER TABLE "FunnelStep" ADD COLUMN IF NOT EXISTS "declineStepId" TEXT;

CREATE INDEX IF NOT EXISTS "FunnelStep_templateId_idx" ON "FunnelStep"("templateId");
CREATE INDEX IF NOT EXISTS "FunnelStep_declineStepId_idx" ON "FunnelStep"("declineStepId");

-- ============================================================
-- GLOBAL COMPONENT — Header, Footer, Announcement Bar, Cart Flyout, Popups, Reusable Sections
-- ============================================================
CREATE TABLE "GlobalComponent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "storeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL DEFAULT '',
    "css" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalComponent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GlobalComponent_storeId_idx" ON "GlobalComponent"("storeId");
CREATE INDEX "GlobalComponent_type_idx" ON "GlobalComponent"("type");

-- ============================================================
-- FORM — Contact, Lead, Quiz, Newsletter forms
-- ============================================================
CREATE TABLE "Form" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'contact',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB DEFAULT '{}',
    "html" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Form_storeId_idx" ON "Form"("storeId");

-- ============================================================
-- FORM SUBMISSION — Stores form entries
-- ============================================================
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- ============================================================
-- GLOBAL DATA — Site-wide variables ({{site.*}})
-- One record per store
-- ============================================================
CREATE TABLE "GlobalData" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "storeId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalData_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GlobalData_storeId_key" ON "GlobalData"("storeId");

-- ============================================================
-- CUSTOM VARIABLE — User-defined variables ({{variable.*}})
-- ============================================================
CREATE TABLE "CustomVariable" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "storeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'text',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomVariable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomVariable_storeId_idx" ON "CustomVariable"("storeId");
CREATE UNIQUE INDEX "CustomVariable_storeId_key_key" ON "CustomVariable"("storeId", "key");

-- ============================================================
-- FUNNEL ANALYTICS EVENT — Per-step tracking
-- ============================================================
CREATE TABLE "FunnelAnalyticsEvent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "storeId" TEXT NOT NULL,
    "funnelId" TEXT,
    "stepId" TEXT,
    "sessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "value" DECIMAL(10,2),
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FunnelAnalyticsEvent_storeId_idx" ON "FunnelAnalyticsEvent"("storeId");
CREATE INDEX "FunnelAnalyticsEvent_funnelId_idx" ON "FunnelAnalyticsEvent"("funnelId");
CREATE INDEX "FunnelAnalyticsEvent_stepId_idx" ON "FunnelAnalyticsEvent"("stepId");
CREATE INDEX "FunnelAnalyticsEvent_eventType_idx" ON "FunnelAnalyticsEvent"("eventType");
CREATE INDEX "FunnelAnalyticsEvent_createdAt_idx" ON "FunnelAnalyticsEvent"("createdAt");

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

-- Page
ALTER TABLE "Page" ADD CONSTRAINT "Page_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PageVersion
ALTER TABLE "PageVersion" ADD CONSTRAINT "PageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Template
ALTER TABLE "Template" ADD CONSTRAINT "Template_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TemplateVersion
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FunnelStep new FKs
ALTER TABLE "FunnelStep" ADD CONSTRAINT "FunnelStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FunnelStep" ADD CONSTRAINT "FunnelStep_declineStepId_fkey" FOREIGN KEY ("declineStepId") REFERENCES "FunnelStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- GlobalComponent
ALTER TABLE "GlobalComponent" ADD CONSTRAINT "GlobalComponent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Form
ALTER TABLE "Form" ADD CONSTRAINT "Form_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FormSubmission
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GlobalData
ALTER TABLE "GlobalData" ADD CONSTRAINT "GlobalData_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CustomVariable
ALTER TABLE "CustomVariable" ADD CONSTRAINT "CustomVariable_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FunnelAnalyticsEvent
ALTER TABLE "FunnelAnalyticsEvent" ADD CONSTRAINT "FunnelAnalyticsEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;