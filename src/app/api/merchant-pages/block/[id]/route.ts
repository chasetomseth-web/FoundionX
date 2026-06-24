import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStoreId } from '@/lib/merchant-pages';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const storeId = await resolveStoreId(req.nextUrl.searchParams.get('storeId') ?? undefined);

    const block = await prisma.merchantPageBlock.findFirst({
      where: {
        id,
        page: {
          storeId,
        },
      },
    });

    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    await prisma.merchantPageBlock.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MERCHANT PAGES] DELETE BLOCK error:', error);
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
  }
}
