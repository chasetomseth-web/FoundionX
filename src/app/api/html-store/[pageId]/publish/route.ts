import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * POST /api/html-store/[pageId]/publish - Publish an HTML page
 */
export async function POST(
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

    // Update to published
    const updated = await prisma.htmlStorePage.update({
      where: { id: params.pageId },
      data: { isPublished: true },
    });

    // Generate the public URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-store.com';
    const publicUrl = `${siteUrl}/store/${page.store.slug}/${page.slug}`;

    return NextResponse.json({
      success: true,
      page: updated,
      publicUrl,
    });
  } catch (error: any) {
    console.error('HTML page publish error:', error);
    return NextResponse.json(
      { error: 'Failed to publish page', message: error.message },
      { status: 500 }
    );
  }
}
