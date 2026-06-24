import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { getAllSnippets } from '@/lib/embed-snippets';

/**
 * GET /api/html-store/snippets - Get all embed snippets for the merchant's store
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await prisma.store.findFirst({
      where: { organizationId: auth.organizationId },
      select: {
        slug: true,
        gtmId: true,
        facebookPixelId: true,
        tiktokPixelId: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Get site URL from environment or use a default
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-store.com';

    const snippets = getAllSnippets(store, siteUrl);

    return NextResponse.json({ snippets });
  } catch (error: any) {
    console.error('Snippets fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snippets', message: error.message },
      { status: 500 }
    );
  }
}
