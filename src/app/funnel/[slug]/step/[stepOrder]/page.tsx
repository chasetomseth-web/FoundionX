import { prisma } from '@/lib/prisma';
import { loadFunnelStep } from '@/lib/funnel-router';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; stepOrder: string }>;
}

import FunnelCookieSetter from '../../../FunnelCookieSetter';

export default async function FunnelStepPage({ params }: Props) {
  const { slug, stepOrder: stepOrderStr } = await params;
  const stepOrder = parseInt(stepOrderStr, 10);

  if (isNaN(stepOrder)) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-600 text-foreground mb-2">Invalid step</h1>
        <p className="text-muted-foreground">The step number is invalid.</p>
      </div>
    );
  }

  const store = await prisma.store.findFirst({ where: { status: 'active' } });
  if (!store) {
    return <div className="p-8 text-center text-muted-foreground">No store configured</div>;
  }

  const data = await loadFunnelStep(slug, stepOrder, store.id);
  if (!data) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-600 text-foreground mb-2">Step not found</h1>
        <p className="text-muted-foreground">
          Step {stepOrder} in funnel "{slug}" doesn't exist.
        </p>
      </div>
    );
  }

  const { currentStep } = data;

  return (
    <div className="min-h-screen bg-background">
      <FunnelCookieSetter slug={data.slug} />
      {currentStep.pageCss && (
        <style dangerouslySetInnerHTML={{ __html: currentStep.pageCss }} />
      )}
      <div
        className="funnel-page"
        dangerouslySetInnerHTML={{ __html: currentStep.pageHtml }}
      />
      {data.totalSteps > 1 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-4 py-2 text-xs text-muted-foreground shadow-lg">
          Step {currentStep.stepOrder + 1} of {data.totalSteps}
        </div>
      )}
    </div>
  );
}