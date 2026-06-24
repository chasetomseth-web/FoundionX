import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStoreId } from '@/lib/merchant-pages';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pageId = String(body.pageId ?? '').trim();
    const blocks = Array.isArray(body.blocks) ? body.blocks : [];
    const storeId = await resolveStoreId(body.storeId);

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    const page = await prisma.merchantPage.findFirst({ where: { id: pageId, storeId } });
    if (!page) {
      return NextResponse.json({ error: 'Merchant Page not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.merchantPageBlock.deleteMany({ where: { pageId } });

      if (blocks.length > 0) {
        const createPayload = blocks.map((block: any) => ({
          id: String(block.id),
          pageId,
          parentId: block.parentId ?? null,
          order: Number(block.order ?? 0),
          type: String(block.type ?? 'text'),
          props: block.props ?? {},
          style: block.style ?? {},
        }));

        await tx.merchantPageBlock.createMany({ data: createPayload });
      }
    });

    return NextResponse.json({ success: true, blocks });
  } catch (error) {
    console.error('[MERCHANT PAGES] UPDATE BLOCKS error:', error);
    return NextResponse.json({ error: 'Failed to update Merchant Page blocks' }, { status: 500 });
  }
}
