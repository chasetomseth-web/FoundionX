/*
  Warnings:

  - You are about to drop the `Affiliate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AffiliateCampaign` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AffiliateClick` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AffiliateCommission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AffiliateLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AffiliatePayout` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AffiliateReferral` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AnalyticsEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AttributionRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AutomationWorkflow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BackgroundJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CheckoutSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConversionEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Coupon` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerAddress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerPaymentMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerSegment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailCampaign` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeatureFlag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Fulfillment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Funnel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FunnelEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FunnelStep` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HtmlTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MerchantPage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MerchantPageBlock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NavigationMenu` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Offer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Price` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductCollection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PublishedPage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Refund` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SeoMetadata` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Store` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoreTheme` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StripeReconciliationLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubscriptionInvoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubscriptionPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubscriptionRetryAttempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportTicket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaxRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TemplateBlock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UploadedAsset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserOrganization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookDeadLetter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkflowEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkflowTrigger` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "funnel_step_type" AS ENUM ('upsell', 'downsell', 'cross_sell', 'order_bump');

-- CreateEnum
CREATE TYPE "upsell_charge_status" AS ENUM ('pending', 'succeeded', 'failed', 'declined');

-- CreateEnum
CREATE TYPE "upsell_session_status" AS ENUM ('active', 'completed', 'expired');

-- DropForeignKey
ALTER TABLE "Affiliate" DROP CONSTRAINT "Affiliate_storeId_fkey";

-- DropForeignKey
ALTER TABLE "AffiliateCampaign" DROP CONSTRAINT "AffiliateCampaign_affiliateId_fkey";

-- DropForeignKey
ALTER TABLE "AffiliateClick" DROP CONSTRAINT "AffiliateClick_affiliateId_fkey";

-- DropForeignKey
ALTER TABLE "AffiliateCommission" DROP CONSTRAINT "AffiliateCommission_affiliateId_fkey";

-- DropForeignKey
ALTER TABLE "AffiliateLink" DROP CONSTRAINT "AffiliateLink_affiliateId_fkey";

-- DropForeignKey
ALTER TABLE "AffiliatePayout" DROP CONSTRAINT "AffiliatePayout_affiliateId_fkey";

-- DropForeignKey
ALTER TABLE "AffiliateReferral" DROP CONSTRAINT "AffiliateReferral_affiliateId_fkey";

-- DropForeignKey
ALTER TABLE "AnalyticsEvent" DROP CONSTRAINT "AnalyticsEvent_storeId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "BackgroundJob" DROP CONSTRAINT "BackgroundJob_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "CheckoutSession" DROP CONSTRAINT "CheckoutSession_orderId_fkey";

-- DropForeignKey
ALTER TABLE "CheckoutSession" DROP CONSTRAINT "CheckoutSession_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Collection" DROP CONSTRAINT "Collection_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_storeId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerAddress" DROP CONSTRAINT "CustomerAddress_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerPaymentMethod" DROP CONSTRAINT "CustomerPaymentMethod_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerSession" DROP CONSTRAINT "CustomerSession_customerId_fkey";

-- DropForeignKey
ALTER TABLE "EmailCampaign" DROP CONSTRAINT "EmailCampaign_storeId_fkey";

-- DropForeignKey
ALTER TABLE "FeatureFlag" DROP CONSTRAINT "FeatureFlag_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Fulfillment" DROP CONSTRAINT "Fulfillment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Funnel" DROP CONSTRAINT "Funnel_storeId_fkey";

-- DropForeignKey
ALTER TABLE "FunnelStep" DROP CONSTRAINT "FunnelStep_funnelId_fkey";

-- DropForeignKey
ALTER TABLE "HtmlTemplate" DROP CONSTRAINT "HtmlTemplate_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_productId_fkey";

-- DropForeignKey
ALTER TABLE "MerchantPage" DROP CONSTRAINT "MerchantPage_storeId_fkey";

-- DropForeignKey
ALTER TABLE "MerchantPageBlock" DROP CONSTRAINT "MerchantPageBlock_pageId_fkey";

-- DropForeignKey
ALTER TABLE "MerchantPageBlock" DROP CONSTRAINT "MerchantPageBlock_parentId_fkey";

-- DropForeignKey
ALTER TABLE "NavigationMenu" DROP CONSTRAINT "NavigationMenu_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_productId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_storeId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "Price" DROP CONSTRAINT "Price_offerId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_storeId_fkey";

-- DropForeignKey
ALTER TABLE "ProductCollection" DROP CONSTRAINT "ProductCollection_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "ProductCollection" DROP CONSTRAINT "ProductCollection_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTag" DROP CONSTRAINT "ProductTag_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- DropForeignKey
ALTER TABLE "PublishedPage" DROP CONSTRAINT "PublishedPage_merchantPageId_fkey";

-- DropForeignKey
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_orderId_fkey";

-- DropForeignKey
ALTER TABLE "SeoMetadata" DROP CONSTRAINT "SeoMetadata_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Store" DROP CONSTRAINT "Store_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "StoreTheme" DROP CONSTRAINT "StoreTheme_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_customerId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionInvoice" DROP CONSTRAINT "SubscriptionInvoice_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionPayment" DROP CONSTRAINT "SubscriptionPayment_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionRetryAttempt" DROP CONSTRAINT "SubscriptionRetryAttempt_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "SupportMessage" DROP CONSTRAINT "SupportMessage_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTag" DROP CONSTRAINT "SupportTag_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_organization_fkey";

-- DropForeignKey
ALTER TABLE "TaxRecord" DROP CONSTRAINT "TaxRecord_orderId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateBlock" DROP CONSTRAINT "TemplateBlock_templateId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_orderId_fkey";

-- DropForeignKey
ALTER TABLE "UploadedAsset" DROP CONSTRAINT "UploadedAsset_storeId_fkey";

-- DropForeignKey
ALTER TABLE "UserOrganization" DROP CONSTRAINT "UserOrganization_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "UserOrganization" DROP CONSTRAINT "UserOrganization_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserSession" DROP CONSTRAINT "UserSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookDeadLetter" DROP CONSTRAINT "WebhookDeadLetter_webhookEventId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowEvent" DROP CONSTRAINT "WorkflowEvent_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowTrigger" DROP CONSTRAINT "WorkflowTrigger_workflowId_fkey";

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "easypostShipmentId" TEXT,
ADD COLUMN     "easypostTrackerId" TEXT,
ADD COLUMN     "labelCreatedAt" TIMESTAMPTZ(6),
ADD COLUMN     "labelUrl" TEXT,
ADD COLUMN     "rateAmount" DECIMAL(10,2),
ADD COLUMN     "service" TEXT,
ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "shippedAt" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "deliveredAt" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(6);

-- DropTable
DROP TABLE "Affiliate";

-- DropTable
DROP TABLE "AffiliateCampaign";

-- DropTable
DROP TABLE "AffiliateClick";

-- DropTable
DROP TABLE "AffiliateCommission";

-- DropTable
DROP TABLE "AffiliateLink";

-- DropTable
DROP TABLE "AffiliatePayout";

-- DropTable
DROP TABLE "AffiliateReferral";

-- DropTable
DROP TABLE "AnalyticsEvent";

-- DropTable
DROP TABLE "ApiKey";

-- DropTable
DROP TABLE "AttributionRecord";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "AutomationWorkflow";

-- DropTable
DROP TABLE "BackgroundJob";

-- DropTable
DROP TABLE "CheckoutSession";

-- DropTable
DROP TABLE "Collection";

-- DropTable
DROP TABLE "ConversionEvent";

-- DropTable
DROP TABLE "Coupon";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "CustomerAddress";

-- DropTable
DROP TABLE "CustomerPaymentMethod";

-- DropTable
DROP TABLE "CustomerSegment";

-- DropTable
DROP TABLE "CustomerSession";

-- DropTable
DROP TABLE "EmailCampaign";

-- DropTable
DROP TABLE "FeatureFlag";

-- DropTable
DROP TABLE "Fulfillment";

-- DropTable
DROP TABLE "Funnel";

-- DropTable
DROP TABLE "FunnelEvent";

-- DropTable
DROP TABLE "FunnelStep";

-- DropTable
DROP TABLE "HtmlTemplate";

-- DropTable
DROP TABLE "Inventory";

-- DropTable
DROP TABLE "MerchantPage";

-- DropTable
DROP TABLE "MerchantPageBlock";

-- DropTable
DROP TABLE "NavigationMenu";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Offer";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "OrderItem";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "Price";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "ProductCollection";

-- DropTable
DROP TABLE "ProductImage";

-- DropTable
DROP TABLE "ProductTag";

-- DropTable
DROP TABLE "ProductVariant";

-- DropTable
DROP TABLE "PublishedPage";

-- DropTable
DROP TABLE "Refund";

-- DropTable
DROP TABLE "SeoMetadata";

-- DropTable
DROP TABLE "Store";

-- DropTable
DROP TABLE "StoreTheme";

-- DropTable
DROP TABLE "StripeReconciliationLog";

-- DropTable
DROP TABLE "Subscription";

-- DropTable
DROP TABLE "SubscriptionInvoice";

-- DropTable
DROP TABLE "SubscriptionPayment";

-- DropTable
DROP TABLE "SubscriptionRetryAttempt";

-- DropTable
DROP TABLE "SupportMessage";

-- DropTable
DROP TABLE "SupportTag";

-- DropTable
DROP TABLE "SupportTicket";

-- DropTable
DROP TABLE "TaxRecord";

-- DropTable
DROP TABLE "TemplateBlock";

-- DropTable
DROP TABLE "Transaction";

-- DropTable
DROP TABLE "UploadedAsset";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "UserOrganization";

-- DropTable
DROP TABLE "UserSession";

-- DropTable
DROP TABLE "WebhookDeadLetter";

-- DropTable
DROP TABLE "WebhookEvent";

-- DropTable
DROP TABLE "WorkflowEvent";

-- DropTable
DROP TABLE "WorkflowTrigger";

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "shipmentId" TEXT NOT NULL,
    "easypostEventId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "location" TEXT,
    "carrier" TEXT,
    "eventTime" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "usage_limit" INTEGER,
    "minimum_order" DECIMAL(10,2),
    "expires_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'active',
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stripe_coupon_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "funnel_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "step_type" "funnel_step_type" NOT NULL DEFAULT 'upsell',
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "html_content" TEXT,
    "decline_next_step_order" INTEGER,
    "accept_next_step_order" INTEGER,
    "stripe_price_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funnel_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" TEXT NOT NULL,
    "stripe_secret_key" TEXT,
    "stripe_publishable_key" TEXT,
    "stripe_webhook_secret" TEXT,
    "resend_api_key" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "upsell_session_id" UUID NOT NULL,
    "funnel_step_id" UUID NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_payment_method_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "upsell_charge_status" DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upsell_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_funnels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "trigger_product_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upsell_funnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stripe_checkout_session_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_payment_method_id" TEXT NOT NULL,
    "funnel_id" UUID,
    "current_step_order" INTEGER DEFAULT 1,
    "status" "upsell_session_status" DEFAULT 'active',
    "accepted_step_orders" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "declined_step_orders" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "customer_email" TEXT,
    "original_order_amount" INTEGER,
    "total_upsell_revenue" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP + '02:00:00'::interval),

    CONSTRAINT "upsell_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackingEvent_easypostEventId_idx" ON "TrackingEvent"("easypostEventId");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_idx" ON "TrackingEvent"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "idx_coupons_code" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "idx_coupons_status" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "idx_funnel_steps_funnel_id" ON "funnel_steps"("funnel_id");

-- CreateIndex
CREATE INDEX "idx_funnel_steps_order" ON "funnel_steps"("funnel_id", "step_order");

-- CreateIndex
CREATE UNIQUE INDEX "integration_settings_provider_key" ON "integration_settings"("provider");

-- CreateIndex
CREATE INDEX "idx_integration_settings_provider" ON "integration_settings"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "store_credentials_store_id_key" ON "store_credentials"("store_id");

-- CreateIndex
CREATE INDEX "idx_store_credentials_store_id" ON "store_credentials"("store_id");

-- CreateIndex
CREATE INDEX "idx_upsell_charges_session" ON "upsell_charges"("upsell_session_id");

-- CreateIndex
CREATE INDEX "idx_upsell_sessions_checkout" ON "upsell_sessions"("stripe_checkout_session_id");

-- CreateIndex
CREATE INDEX "idx_upsell_sessions_customer" ON "upsell_sessions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "Shipment_easypostShipmentId_idx" ON "Shipment"("easypostShipmentId");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "funnel_steps" ADD CONSTRAINT "funnel_steps_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "upsell_funnels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "upsell_charges" ADD CONSTRAINT "upsell_charges_funnel_step_id_fkey" FOREIGN KEY ("funnel_step_id") REFERENCES "funnel_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "upsell_charges" ADD CONSTRAINT "upsell_charges_upsell_session_id_fkey" FOREIGN KEY ("upsell_session_id") REFERENCES "upsell_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "upsell_sessions" ADD CONSTRAINT "upsell_sessions_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "upsell_funnels"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
