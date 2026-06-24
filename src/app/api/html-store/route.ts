import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { deleteHtmlFile } from '@/lib/supabase-storage';

/**
 * GET /api/html-store - List all HTML pages for the authenticated merchant's store
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await prisma.store.findFirst({
      where: { organizationId: auth.organizationId },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const pages = await prisma.htmlStorePage.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error('HTML store list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/html-store?id=pageId - Delete an HTML page
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('id');

    if (!pageId) {
      return NextResponse.json(
        { error: 'Missing page ID' },
        { status: 400 }
      );
    }

    const page = await prisma.htmlStorePage.findUnique({
      where: { id: pageId },
      include: { store: true },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (page.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete file from storage
    const fileName = page.filePath.split('/').pop() || '';
    await deleteHtmlFile(page.storeId, fileName);

    // Delete database record
    await prisma.htmlStorePage.delete({
      where: { id: pageId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('HTML page delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete page', message: error.message },
      { status: 500 }
    );
  }
}
