import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { ensureCorePages } from '@/lib/storefront-seed';
import { completeOnboardingStep, type OnboardingStep } from '@/lib/onboarding';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const { prisma } = await import('@/lib/prisma');
  let orgId = session.organizationId;

  let org = await prisma.organization.findFirst({ where: { id: orgId } });
  if (!org) {
    const defaultName = 'My Store';
    const slugBase = defaultName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'merchantos';
    let orgSlug = slugBase;
    let suffix = 1;
    while (await prisma.organization.findFirst({ where: { slug: orgSlug } })) {
      orgSlug = `${slugBase}-${suffix}`;
      suffix += 1;
    }
    org = await prisma.organization.create({
      data: {
        name: defaultName,
        slug: orgSlug,
        status: 'active',
      },
    });
    orgId = org.id;
  }

  let store = await prisma.store.findFirst({ where: { organizationId: orgId } });
  if (!store) store = await prisma.store.findFirst(); // bypass fallback
  if (!store) {
    const defaultName = 'My Store';
    const slugBase = defaultName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'store';
    let storeSlug = slugBase;
    let suffix = 1;
    while (await prisma.store.findFirst({ where: { slug: storeSlug } })) {
      storeSlug = `${slugBase}-${suffix}`;
      suffix += 1;
    }
    store = await prisma.store.create({
      data: {
        organizationId: orgId,
        name: defaultName,
        slug: storeSlug,
        currency: 'USD',
        timezone: 'UTC',
        status: 'draft',
      },
    });
  }

  await ensureCorePages(store.id);

  // Mark initial onboarding steps as completed using the onboarding library
  await completeOnboardingStep(orgId, 'account_setup' as OnboardingStep, {
    businessName: store.name,
    email: session.email ?? '',
    fullName: session.name ?? '',
  });
  await completeOnboardingStep(orgId, 'store_configuration' as OnboardingStep, {
    storeName: store.name,
    domain: store.slug,
    currency: store.currency,
  });

  return NextResponse.json({ success: true, storeId: store.id });
}
