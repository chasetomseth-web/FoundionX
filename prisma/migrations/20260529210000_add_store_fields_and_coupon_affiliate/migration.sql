-- AlterTable: Add ship-from address, pixel tracking fields to Store
ALTER TABLE "Store" ADD COLUMN "fromAddressName" TEXT,
ADD COLUMN "fromAddressStreet" TEXT,
ADD COLUMN "fromAddressCity" TEXT,
ADD COLUMN "fromAddressState" TEXT,
ADD COLUMN "fromAddressZip" TEXT,
ADD COLUMN "fromAddressCountry" TEXT,
ADD COLUMN "fromAddressPhone" TEXT,
ADD COLUMN "gtmId" TEXT,
ADD COLUMN "facebookPixelId" TEXT,
ADD COLUMN "tiktokPixelId" TEXT;

-- AlterTable: Add affiliateId to Coupon
ALTER TABLE "Coupon" ADD COLUMN "affiliateId" TEXT;

-- CreateIndex: Index on Coupon.affiliateId for affiliate-based coupon lookup
CREATE INDEX "Coupon_affiliateId_idx" ON "Coupon"("affiliateId");