import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * GET /api/html-store/[pageId] - Get single page details
 */
export const runtime = 'nodejs';
export async function GET(
  req: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = await prisma.htmlStorePage.findUnique({
      where: { id: params.pageId },
      include: { store: true },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (page.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('HTML page get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/html-store/[pageId] - Update page details
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = await prisma.htmlStorePage.findUnique({
      where: { id: params.pageId },
      include: { store: true },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (page.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, isHomePage, isPublished } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    if (slug !== undefined && slug !== page.slug) {
      // Sanitize new slug
      const sanitizedSlug = slug
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check uniqueness
      const existing = await prisma.htmlStorePage.findUnique({
        where: {
          storeId_slug: {
            storeId: page.storeId,
            slug: sanitizedSlug,
          },
        },
      });

      if (existing && existing.id !== params.pageId) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 409 }
        );
      }

      updateData.slug = sanitizedSlug;
    }

    if (isHomePage === true && page.isHomePage === false) {
      // Unset other home pages
      await prisma.htmlStorePage.updateMany({
        where: { storeId: page.storeId, isHomePage: true },
        data: { isHomePage: false },
      });
      updateData.isHomePage = true;
    } else if (isHomePage === false) {
      updateData.isHomePage = false;
    }

    const updated = await prisma.htmlStorePage.update({
      where: { id: params.pageId },
      data: updateData,
    });

    return NextResponse.json({ page: updated });
  } catch (error: any) {
    console.error('HTML page update error:', error);
    return NextResponse.json(
      { error: 'Failed to update page', message: error.message },
      { status: 500 }
    );
  }
}
