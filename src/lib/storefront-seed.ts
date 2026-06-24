import { prisma } from '@/lib/prisma';

const CORE_PAGES = [
  { name: 'Homepage', slug: '/', type: 'homepage', isCore: true },
  { name: 'Checkout Page', slug: '/checkout', type: 'checkout', isCore: true },
  { name: 'Thank You Page', slug: '/checkout/success', type: 'thankyou', isCore: true },
  { name: 'Upsell #1', slug: '/upsell/1', type: 'upsell1', isCore: true },
  { name: 'Upsell #2', slug: '/upsell/2', type: 'upsell2', isCore: true },
  { name: 'Downsell #1', slug: '/downsell/1', type: 'downsell1', isCore: true },
  { name: 'Downsell #2', slug: '/downsell/2', type: 'downsell2', isCore: true },
];

/**
 * Ensures all core pages exist for a store.
 * Creates them only if they don't already exist (by slug).
 */
export async function ensureCorePages(storeId: string) {
  const pages = await Promise.all(
    CORE_PAGES.map((cp) =>
      prisma.merchantPage.upsert({
        where: { storeId_slug: { storeId, slug: cp.slug } },
        update: {
          name: cp.name,
          type: cp.type,
          isCore: cp.isCore,
        },
        create: {
          storeId,
          name: cp.name,
          slug: cp.slug,
          type: cp.type,
          isCore: cp.isCore,
          status: 'draft',
          isPublished: false,
          html: '',
        },
      })
    )
  );

  // Ensure default journey steps exist
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { journeySteps: true } });
  if (store && (!store.journeySteps || (store.journeySteps as any[]).length === 0)) {
    const homepage = pages.find((p) => p.slug === '/');
    const checkout = pages.find((p) => p.slug === '/checkout');
    const thankYou = pages.find((p) => p.slug === '/checkout/success');

    const defaultJourney = [
      { pageId: homepage?.id, slug: '/', name: 'Homepage' },
      { pageId: checkout?.id, slug: '/checkout', name: 'Checkout Page' },
      { pageId: thankYou?.id, slug: '/checkout/success', name: 'Thank You Page' },
    ];

    await prisma.store.update({
      where: { id: storeId },
      data: { journeySteps: defaultJourney },
    });
  }

  return pages;
}

// Ensure core templates, components, and variables exist for a store
export async function ensureCoreTemplatesAndAssets(storeId: string) {
  // Core templates
  const templates = [
    { name: 'Homepage Template', slug: '_template/homepage', type: 'homepage' },
    { name: 'Product Template', slug: '_template/product', type: 'product' },
    { name: 'Checkout Template', slug: '_template/checkout', type: 'checkout' },
    { name: 'Upsell Template', slug: '_template/upsell', type: 'upsell' },
    { name: 'Downsell Template', slug: '_template/downsell', type: 'downsell' },
    { name: 'Thank You Template', slug: '_template/thankyou', type: 'thankyou' },
  ];

  await Promise.all(
    templates.map((t) =>
      prisma.merchantPage.upsert({
        where: { storeId_slug: { storeId, slug: t.slug } },
        update: {
          name: t.name,
          type: t.type,
          isCore: true,
          isTemplate: true,
        },
        create: {
          storeId,
          name: t.name,
          slug: t.slug,
          type: t.type,
          isCore: true,
          isTemplate: true,
          status: 'draft',
          isPublished: false,
          html: '',
        },
      })
    )
  );

  // Core site components
  const components = [
    { name: 'Header', slug: 'header', type: 'header' },
    { name: 'Footer', slug: 'footer', type: 'footer' },
    { name: 'Cart Flyout', slug: 'cart-flyout', type: 'cart-flyout' },
    { name: 'Announcement Bar', slug: 'announcement', type: 'announcement' },
  ];

  await Promise.all(
    components.map((c) =>
      prisma.siteComponent.upsert({
        where: { storeId_slug: { storeId, slug: c.slug } },
        update: {
          name: c.name,
          type: c.type,
        },
        create: {
          storeId,
          name: c.name,
          slug: c.slug,
          type: c.type,
          html: '',
          isGlobal: false,
        },
      })
    )
  );

  // Core site variables — all 10 required site variable keys
  const variables = [
    'site.name',
    'site.phone',
    'site.email',
    'site.address',
    'site.logo',
    'site.support_email',
    'site.facebook',
    'site.instagram',
    'site.youtube',
    'site.tiktok',
  ];

  await Promise.all(
    variables.map((key) =>
      prisma.siteVariable.upsert({
        where: { storeId_key: { storeId, key } },
        update: {},
        create: { storeId, key, value: '' },
      })
    )
  );

  return true;
}