import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BlockType, resolveStoreId, sortBlocks } from '@/lib/merchant-pages';

export const runtime = 'nodejs';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const storeId = await resolveStoreId(req.nextUrl.searchParams.get('storeId') ?? undefined);

    const page = await prisma.merchantPage.findFirst({
      where: {
        id,
        storeId,
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Merchant Page not found' }, { status: 404 });
    }

    const rawBlocks = await prisma.merchantPageBlock.findMany({
      where: { pageId: page.id },
      orderBy: { order: 'asc' },
    });

    const blocks = rawBlocks.map((block) => ({
      ...block,
      type: block.type as BlockType,
      createdAt: block.createdAt.toISOString(),
      updatedAt: block.updatedAt.toISOString(),
    }));

    return NextResponse.json({ page, blocks: sortBlocks(blocks) });
  } catch (error) {
    console.error('[MERCHANT PAGES] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch Merchant Page' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const storeId = await resolveStoreId(req.nextUrl.searchParams.get('storeId') ?? undefined);

    const page = await prisma.merchantPage.findFirst({ where: { id, storeId } });
    if (!page) {
      return NextResponse.json({ error: 'Merchant Page not found' }, { status: 404 });
    }

    await prisma.merchantPage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MERCHANT PAGES] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete Merchant Page' }, { status: 500 });
  }
}
