-- CreateTable
CREATE TABLE "MerchantPage" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantPageBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "style" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantPageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantPage_storeId_idx" ON "MerchantPage"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPage_storeId_slug_key" ON "MerchantPage"("storeId", "slug");

-- CreateIndex
CREATE INDEX "MerchantPageBlock_pageId_idx" ON "MerchantPageBlock"("pageId");

-- CreateIndex
CREATE INDEX "MerchantPageBlock_parentId_idx" ON "MerchantPageBlock"("parentId");

-- AddForeignKey
ALTER TABLE "MerchantPage" ADD CONSTRAINT "MerchantPage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPageBlock" ADD CONSTRAINT "MerchantPageBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "MerchantPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPageBlock" ADD CONSTRAINT "MerchantPageBlock_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MerchantPageBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
