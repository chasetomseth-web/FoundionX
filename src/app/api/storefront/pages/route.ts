import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { ensureCorePages } from '@/lib/storefront-seed';

// GET /api/storefront/pages — list all pages for the store
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const store = await prisma.store.findFirst({
    where: { organizationId: session.organizationId },
  });
  if (!store) return NextResponse.json({ pages: [] });

  // Ensure core pages exist
  await ensureCorePages(store.id);

  const pages = await prisma.merchantPage.findMany({
    where: { storeId: store.id },
    orderBy: [{ isCore: 'desc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ pages });
}

// POST /api/storefront/pages — create a new landing page
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const store = await prisma.store.findFirst({
    where: { organizationId: session.organizationId },
  });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const body = await req.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.merchantPage.findUnique({
      where: { storeId_slug: { storeId: store.id, slug } },
    });
    if (existing) {
      return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 409 });
    }

    const page = await prisma.merchantPage.create({
      data: {
        storeId: store.id,
        name,
        slug,
        type: 'landing',
        isCore: false,
        isPublished: false,
        status: 'draft',
        html: '',
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error('[STOREFRONT_PAGES] POST error:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}