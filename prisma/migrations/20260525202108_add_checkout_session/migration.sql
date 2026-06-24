-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pricingType" TEXT NOT NULL DEFAULT 'one_time',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripePriceId" TEXT,
    "enableCoupons" BOOLEAN NOT NULL DEFAULT true,
    "enableOrderBump" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'one_time',
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "stripePriceId" TEXT,
    "trialDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percentage',
    "amountOff" DECIMAL(10,2),
    "percentOff" DECIMAL(5,2),
    "stripeCouponId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelStep" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL DEFAULT 0,
    "nextStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripeSessionUrl" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'payment',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "funnelId" TEXT,
    "pageId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedPage" (
    "id" TEXT NOT NULL,
    "merchantPageId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "css" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishedPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_storeId_idx" ON "Offer"("storeId");

-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_storeId_slug_key" ON "Offer"("storeId", "slug");

-- CreateIndex
CREATE INDEX "Price_offerId_idx" ON "Price"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_storeId_idx" ON "Coupon"("storeId");

-- CreateIndex
CREATE INDEX "Funnel_storeId_idx" ON "Funnel"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_storeId_slug_key" ON "Funnel"("storeId", "slug");

-- CreateIndex
CREATE INDEX "FunnelStep_funnelId_idx" ON "FunnelStep"("funnelId");

-- CreateIndex
CREATE INDEX "FunnelStep_pageId_idx" ON "FunnelStep"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_orderId_key" ON "CheckoutSession"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_idempotencyKey_key" ON "CheckoutSession"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_stripeSessionId_key" ON "CheckoutSession"("stripeSessionId");

-- CreateIndex
CREATE INDEX "CheckoutSession_storeId_idx" ON "CheckoutSession"("storeId");

-- CreateIndex
CREATE INDEX "CheckoutSession_orderId_idx" ON "CheckoutSession"("orderId");

-- CreateIndex
CREATE INDEX "AffiliateClick_affiliateId_idx" ON "AffiliateClick"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliateClick_funnelId_idx" ON "AffiliateClick"("funnelId");

-- CreateIndex
CREATE INDEX "AffiliateClick_pageId_idx" ON "AffiliateClick"("pageId");

-- CreateIndex
CREATE INDEX "PublishedPage_slug_idx" ON "PublishedPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPage_merchantPageId_key" ON "PublishedPage"("merchantPageId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPage_slug_key" ON "PublishedPage"("slug");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStep" ADD CONSTRAINT "FunnelStep_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedPage" ADD CONSTRAINT "PublishedPage_merchantPageId_fkey" FOREIGN KEY ("merchantPageId") REFERENCES "MerchantPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
