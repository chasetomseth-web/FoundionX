import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStoreId } from '@/lib/merchant-pages';
import { buildPublishedPageHtml } from '@/lib/merchant-pages/publish';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as any;
    const pageId = String(body.pageId ?? '').trim();
    const storeId = await resolveStoreId(body.storeId);

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    const page = await prisma.merchantPage.findFirst({ where: { id: pageId, storeId }, include: { blocks: true, publishedPage: true } });
    if (!page) {
      return NextResponse.json({ error: 'Merchant Page not found' }, { status: 404 });
    }

    const blocks = page.blocks.map((block) => ({
      ...block,
      props: block.props ?? {},
      style: block.style ?? {},
    }));

    // Load pixel IDs from store settings
    const store = await prisma.store.findFirst({
      where: { id: storeId },
      select: { gtmId: true, facebookPixelId: true, tiktokPixelId: true },
    });

    const publishedHtml = buildPublishedPageHtml(blocks, {
      gtmId: store?.gtmId ?? undefined,
      facebookPixelId: store?.facebookPixelId ?? undefined,
      tiktokPixelId: store?.tiktokPixelId ?? undefined,
    });

    await prisma.publishedPage.upsert({
      where: { merchantPageId: pageId },
      update: {
        html: publishedHtml.html,
        css: publishedHtml.css,
        metadata: { ...page.metadata, publishedAt: new Date().toISOString() },
        publishedAt: new Date(),
        slug: page.slug,
      },
      create: {
        merchantPageId: pageId,
        slug: page.slug,
        html: publishedHtml.html,
        css: publishedHtml.css,
        metadata: { ...page.metadata, publishedAt: new Date().toISOString() },
        publishedAt: new Date(),
      },
    });

    await prisma.merchantPage.update({ where: { id: pageId }, data: { status: 'published' } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MERCHANT PAGES] PUBLISH error:', error);
    return NextResponse.json({ error: 'Failed to publish Merchant Page' }, { status: 500 });
  }
}
