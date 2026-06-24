import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import BackButton from '@/components/ui/back-button';

export const dynamic = 'force-dynamic';

export default async function FunnelListPage() {
  const store = await prisma.store.findFirst({ where: { status: 'active' } });
  if (!store) {
    return <div className="p-8 text-center text-muted-foreground">No store configured</div>;
  }

  const funnels = await prisma.funnel.findMany({
    where: { storeId: store.id, status: 'active' },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { steps: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Funnels</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {funnels.length} active funnel{funnels.length !== 1 ? 's' : ''} — multi-step journeys for your customers
          </p>
        </div>
      </div>

      {funnels.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm">No funnels created yet.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Go to Upsell Funnels to create a new funnel with landing, upsell, and downsell steps.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {funnels.map((funnel) => (
            <Link
              key={funnel.id}
              href={`/funnel/${funnel.slug}`}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors flex items-center justify-between"
            >
              <div>
                <h3 className="font-600 text-foreground">{funnel.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {funnel._count.steps} step{funnel._count.steps !== 1 ? 's' : ''}
                  {' · '}/funnel/{funnel.slug}
                </p>
              </div>
              <span className="text-xs text-primary font-500">View →</span>
            </Link>
          ))}
        </div>
      )}

      {/* How it works section */}
      <div className="bg-muted/30 border border-border rounded-xl p-5 mt-4">
        <h3 className="text-sm font-600 text-foreground mb-3">How funnels work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="font-500 text-foreground mb-1">1. Build</p>
            <p className="text-xs text-muted-foreground">
              Create steps in Upsell Funnels with HTML pages, then set accept/decline paths.
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="font-500 text-foreground mb-1">2. Link</p>
            <p className="text-xs text-muted-foreground">
              Each step uses a Published Page as its HTML content. Use <code className="text-primary text-[10px]">{'{{next_url}}'}</code> for navigation buttons.
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="font-500 text-foreground mb-1">3. Publish</p>
            <p className="text-xs text-muted-foreground">
              Share the funnel URL: <code className="text-primary text-[10px]">/funnel/your-slug</code>. Steps auto-advance based on accept/decline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}