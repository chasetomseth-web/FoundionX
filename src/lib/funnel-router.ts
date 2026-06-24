/**
 * Funnel Router
 * Resolves URL paths + session state into "which page to render next"
 * for the multi-step funnel journey (landing → product → checkout → upsell → downsell → thank-you).
 */

import { prisma } from '@/lib/prisma';
import { renderStorefrontTemplate, type StorefrontContext } from '@/lib/storefront-engine';

export interface FunnelStepData {
  stepOrder: number;
  type: string;
  pageId: string;
  pageHtml: string;
  pageCss: string;
  nextStepOrder: number | null;
}

export interface FunnelData {
  id: string;
  name: string;
  slug: string;
  totalSteps: number;
  currentStep: FunnelStepData;
}

/**
 * Load a funnel by its slug and return the first step's data.
 */
export async function loadFunnelStart(
  slug: string,
  storeId: string,
  contextOverrides?: Partial<StorefrontContext>,
): Promise<FunnelData | null> {
  const funnel = await prisma.funnel.findFirst({
    where: { slug, storeId, status: 'active' },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        take: 1,
      },
    },
  });

  if (!funnel || funnel.steps.length === 0) return null;

  return buildFunnelData(funnel, funnel.steps[0], storeId, contextOverrides);
}

/**
 * Load a specific step in a funnel.
 */
export async function loadFunnelStep(
  slug: string,
  stepOrder: number,
  storeId: string,
  contextOverrides?: Partial<StorefrontContext>,
): Promise<FunnelData | null> {
  const funnel = await prisma.funnel.findFirst({
    where: { slug, storeId, status: 'active' },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
      },
    },
  });

  if (!funnel) return null;

  const step = funnel.steps.find((s) => s.stepOrder === stepOrder);
  if (!step) return null;

  return buildFunnelData(funnel, step, storeId, contextOverrides);
}

async function buildFunnelData(
  funnel: { id: string; name: string; slug: string },
  step: { id: string; stepOrder: number; type: string; pageId: string; nextStepId: string | null },
  storeId: string,
  contextOverrides?: Partial<StorefrontContext>,
): Promise<FunnelData> {
  const totalSteps = await prisma.funnelStep.count({ where: { funnelId: funnel.id } });

  // Load all steps to resolve accept/decline routing
  const allSteps = await prisma.funnelStep.findMany({
    where: { funnelId: funnel.id },
    orderBy: { stepOrder: 'asc' },
  });

  let pageHtml = '';
  let pageCss = '';

  // Load the published page HTML
  const page = await prisma.publishedPage.findUnique({ where: { id: step.pageId } });
  if (page) {
    const context: StorefrontContext = {
      store: { name: '', currency: 'USD', domain: '' },
      ...contextOverrides,
    };

    // Compute accept URL (next_step_id)
    let nextUrl: string | null = null;
    if (step.nextStepId) {
      const nextStep = allSteps.find((s) => s.id === step.nextStepId);
      if (nextStep) {
        nextUrl = `/funnel/${funnel.slug}/step/${nextStep.stepOrder}`;
      }
    } else {
      // Last step — go to checkout
      nextUrl = '/checkout';
    }

    // Compute decline URL — go to the step after the next step, or thank-you page
    let declineUrl: string | null = null;
    let declineStepOrder: number | null = null;

    if (step.nextStepId) {
      // Decline: skip the accept step, go to the step after it (if any)
      const acceptStep = allSteps.find((s) => s.id === step.nextStepId);
      if (acceptStep) {
        // Find the step AFTER the accept step
        const declineTarget = allSteps.find((s) => s.stepOrder > acceptStep.stepOrder);
        if (declineTarget) {
          declineUrl = `/funnel/${funnel.slug}/step/${declineTarget.stepOrder}`;
          declineStepOrder = declineTarget.stepOrder;
        }
      }
    }

    if (!declineUrl) {
      // No decline target found — go to thank-you page
      declineUrl = '/checkout/success';
    }

    // Add funnel context for {{next_url}}, {{decline_url}}, and {{funnel.*}} bindings
    const funnelContext = {
      funnel: {
        name: funnel.name,
        slug: funnel.slug,
        step_order: step.stepOrder,
        total_steps: totalSteps,
        step_type: step.type,
        is_first: step.stepOrder === 0,
        is_last: step.stepOrder === totalSteps - 1,
        next_url: nextUrl ?? '',
        decline_url: declineUrl ?? '',
        decline_step_order: declineStepOrder,
      },
    };

    const mergedContext = { ...context, ...funnelContext };

    const rendered = renderStorefrontTemplate(page.html, page.css ?? '', mergedContext);
    pageHtml = rendered.html;
    pageCss = rendered.css;
  }

  return {
    id: funnel.id,
    name: funnel.name,
    slug: funnel.slug,
    totalSteps,
    currentStep: {
      stepOrder: step.stepOrder,
      type: step.type,
      pageId: step.pageId,
      pageHtml,
      pageCss,
      nextStepOrder: step.nextStepId
        ? (allSteps.find((s) => s.id === step.nextStepId)?.stepOrder ?? null)
        : null,
    },
  };
}

/**
 * Get all active funnels for a store (for listing on /funnel or storefront).
 */
export async function listFunnels(storeId: string) {
  return prisma.funnel.findMany({
    where: { storeId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      _count: { select: { steps: true } },
    },
  });
}