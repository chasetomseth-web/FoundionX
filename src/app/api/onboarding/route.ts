import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import {
  getOnboardingProgress,
  completeOnboardingStep,
  runLaunchValidation,
  activateStoreLive,
  runPreLaunchSimulation,
  updateStoreStatus,
  type OnboardingStep,
  type StoreStatus,
} from '@/lib/onboarding';
import { ensureCorePages } from '@/lib/storefront-seed';

// GET /api/onboarding — get current onboarding progress
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    const progress = await getOnboardingProgress(session.organizationId);
    return NextResponse.json({ progress });
  } catch (error) {
    console.error('[ONBOARDING] GET error:', error);
    return NextResponse.json({ error: 'Failed to get onboarding progress' }, { status: 500 });
  }
}

// POST /api/onboarding — complete a step or trigger an action
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { action, step, data } = body;

    switch (action) {
      case 'complete_step': {
        if (!step) {
          return NextResponse.json({ error: 'step is required' }, { status: 400 });
        }
        if (step === 'account_setup') {
          const { prisma } = await import('@/lib/prisma');
          let orgId = session.organizationId;
          let org = await prisma.organization.findFirst({ where: { id: orgId } });
          if (!org) {
            const businessName = String(data?.businessName ?? 'My Business').trim();
            const email = String(data?.email ?? 'owner@app.com').trim();
            const slugBase = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'merchantos';
            let orgSlug = slugBase;
            let suffix = 1;
            while (await prisma.organization.findUnique({ where: { slug: orgSlug } })) {
              orgSlug = `${slugBase}-${suffix}`;
              suffix += 1;
            }
            org = await prisma.organization.create({
              data: {
                name: businessName,
                slug: orgSlug,
                status: 'active',
              },
            });
            orgId = org.id;
          }
          const existingStore = await prisma.store.findFirst({ where: { organizationId: org.id } });
          let store = existingStore;
          if (!store) {
            const storeName = String(data?.businessName ?? 'My Store').trim();
            const slugBase = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'store';
            let storeSlug = slugBase;
            let suffix = 1;
            while (await prisma.store.findFirst({ where: { slug: storeSlug } })) {
              storeSlug = `${slugBase}-${suffix}`;
              suffix += 1;
            }
            store = await prisma.store.create({
              data: {
                organizationId: org.id,
                name: storeName,
                slug: storeSlug,
                currency: 'USD',
                timezone: 'UTC',
                status: 'draft',
              },
            });
          }
          // Seed the 7 core pages
          await ensureCorePages(store.id);
          const progress = await completeOnboardingStep(org.id, step as OnboardingStep, data ?? {});
          return NextResponse.json({ progress });
        }

        if (step === 'store_configuration') {
          const { prisma } = await import('@/lib/prisma');
          let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
          if (!store) store = await prisma.store.findFirst(); // bypass fallback
          if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
          }
          const storeName = String(data?.storeName ?? store.name).trim();
          const domain = String(data?.domain ?? '').trim();
          const currency = String(data?.currency ?? store.currency).trim();
          const slugBase = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'store';
          const finalSlug = domain || slugBase;
          await prisma.store.update({
            where: { id: store.id },
            data: { name: storeName, slug: finalSlug, currency },
          });
          const progress = await completeOnboardingStep(session.organizationId, step as OnboardingStep, data ?? {});
          return NextResponse.json({ progress });
        }
        const progress = await completeOnboardingStep(
          session.organizationId,
          step as OnboardingStep,
          data ?? {}
        );
        return NextResponse.json({ progress });
      }

      case 'run_validation': {
        const result = await runLaunchValidation(session.organizationId);
        return NextResponse.json({ validation: result });
      }

      case 'run_simulation': {
        const result = await runPreLaunchSimulation(session.organizationId);
        return NextResponse.json({ simulation: result });
      }

      case 'go_live': {
        const result = await activateStoreLive(session.organizationId, session.userId);
        return NextResponse.json({ result });
      }

      case 'save_step': {
        if (!step) {
          return NextResponse.json({ error: 'step is required for save_step' }, { status: 400 });
        }
        // Save step data without marking complete or advancing
        const { prisma } = await import('@/lib/prisma');
        let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
        if (!store) store = await prisma.store.findFirst(); // bypass fallback
        if (store) {
          const journeyData = (store.journeySteps as Record<string, unknown>) ?? {};
          const onboarding = (journeyData.onboarding as Record<string, unknown>) ?? {};
          const stepData = (onboarding.stepData as Record<string, unknown>) ?? {};
          stepData[step] = { ...((stepData[step] as Record<string, unknown>) ?? {}), ...(data ?? {}), savedAt: new Date().toISOString() };
          await prisma.store.update({
            where: { id: store.id },
            data: {
              journeySteps: {
                ...journeyData,
                onboarding: {
                  ...onboarding,
                  stepData,
                  lastUpdated: new Date().toISOString(),
                },
              } as any,
            },
          });
        }
        return NextResponse.json({ success: true });
      }

      case 'update_status': {
        const { newStatus, reason } = data ?? {};
        if (!newStatus) {
          return NextResponse.json({ error: 'newStatus is required' }, { status: 400 });
        }
        const result = await updateStoreStatus(
          session.organizationId,
          newStatus as StoreStatus,
          session.userId,
          reason
        );
        return NextResponse.json({ result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[ONBOARDING] POST error:', error);
    const message = error instanceof Error ? error.message : 'Onboarding action failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
