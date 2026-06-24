import MerchantPageDashboard from '@/components/merchant-pages/MerchantPageDashboard';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MerchantPagesPage() {
  const store = await prisma.store.findFirst();
  const pages = store
    ? (
        await prisma.merchantPage.findMany({
          where: { storeId: store.id },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, name: true, slug: true, updatedAt: true },
        })
      ).map((page) => ({
        ...page,
        updatedAt: page.updatedAt.toISOString(),
      }))
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <MerchantPageDashboard initialPages={pages} defaultStoreId={store?.id ?? null} />
    </div>
  );
}
