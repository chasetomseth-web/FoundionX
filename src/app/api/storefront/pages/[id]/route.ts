import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// PATCH /api/storefront/pages/[id] — update HTML content, name, status, publish
export const runtime = 'nodejs';
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const page = await prisma.merchantPage.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    // Verify store ownership
    const store = await prisma.store.findFirst({
      where: { id: page.storeId, organizationId: session.organizationId },
    });
    if (!store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.html !== undefined) updateData.html = body.html;
    if (body.css !== undefined) updateData.css = body.css;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;

    // Handle publish/unpublish
    if (body.isPublished !== undefined) {
      updateData.isPublished = body.isPublished;
      if (body.isPublished) {
        updateData.publishedAt = new Date();
        updateData.status = 'published';
      } else {
        updateData.publishedAt = null;
        updateData.status = 'draft';
      }
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'published') {
        updateData.isPublished = true;
        updateData.publishedAt = new Date();
      } else {
        updateData.isPublished = false;
        updateData.publishedAt = null;
      }
    }

    // Validate publish: require homepage, checkout, thankyou to have content
    const wantPublish = body.isPublished === true || body.status === 'published';
    if (wantPublish) {
      if (page.type === 'homepage' || page.type === 'checkout' || page.type === 'thankyou') {
        const htmlToCheck = body.html !== undefined ? body.html : page.html;
        if (!htmlToCheck || htmlToCheck.trim() === '') {
          return NextResponse.json({
            error: `${page.name} must have content before publishing`,
          }, { status: 400 });
        }
      }
    }

    const updated = await prisma.merchantPage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ page: updated });
  } catch (error) {
    console.error('[STOREFRONT_PAGES_PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

// DELETE /api/storefront/pages/[id] — delete user-created pages only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const page = await prisma.merchantPage.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    // Verify store ownership
    const store = await prisma.store.findFirst({
      where: { id: page.storeId, organizationId: session.organizationId },
    });
    if (!store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Prevent deletion of core pages
    if (page.isCore) {
      return NextResponse.json({ error: 'Core pages cannot be deleted' }, { status: 400 });
    }

    await prisma.merchantPage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[STOREFRONT_PAGES_DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}