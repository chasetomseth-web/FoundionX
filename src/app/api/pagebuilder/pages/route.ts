import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { ensureCorePages, ensureCoreTemplatesAndAssets } from '@/lib/storefront-seed';

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ pages: [] });

  // Ensure core pages + templates/components/variables exist
  try {
    await ensureCorePages(store.id);
    await ensureCoreTemplatesAndAssets(store.id);
  } catch (e) {
    console.error("[PAGEBUILDER] Seed error:", e);
  }

  const pages = await prisma.merchantPage.findMany({
    where: { storeId: store.id },
    orderBy: [{ isCore: 'desc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const body = await req.json();
    const { name, slug, type } = body;

    if (!name || !slug) return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });

    const cleanSlug = slug.startsWith('/') ? slug : `/${slug}`;

    const existing = await prisma.merchantPage.findUnique({ where: { storeId_slug: { storeId: store.id, slug: cleanSlug } } });
    if (existing) return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 409 });

    const page = await prisma.merchantPage.create({
      data: {
        storeId: store.id,
        name,
        slug: cleanSlug,
        type: type ?? 'landing',
        isCore: false,
        isTemplate: false,
        isPublished: false,
        status: 'draft',
        html: '',
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error('[PAGEBUILDER_PAGES] POST error:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
