import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadFunnelStart } from '@/lib/funnel-router';
import { getAuthFromRequest } from '@/lib/auth';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

import FunnelCookieSetter from '../FunnelCookieSetter';

export default async function FunnelStartPage({ params }: Props) {
  const { slug } = await params;

  // Determine store from the request (by hostname or first store for now)
  const store = await prisma.store.findFirst({ where: { status: 'active' } });
  if (!store) {
    return <div className="p-8 text-center text-muted-foreground">No store configured</div>;
  }

  const data = await loadFunnelStart(slug, store.id);
  if (!data) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-600 text-foreground mb-2">Funnel not found</h1>
        <p className="text-muted-foreground">The funnel "{slug}" doesn't exist or isn't active.</p>
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
      {/* Step indicator — only visible if multiple steps */}
      {data.totalSteps > 1 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-4 py-2 text-xs text-muted-foreground shadow-lg">
          Step {currentStep.stepOrder + 1} of {data.totalSteps}
        </div>
      )}
    </div>
  );
}