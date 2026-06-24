import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStoreId, slugifyPageName } from '@/lib/merchant-pages';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const storeId = await resolveStoreId(body.storeId);

    if (!name) {
      return NextResponse.json({ error: 'Page name is required' }, { status: 400 });
    }

    const slug = slugifyPageName(name);
    const page = await prisma.merchantPage.create({
      data: {
        name,
        slug,
        storeId,
        metadata: {},
        settings: {},
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error('[MERCHANT PAGES] CREATE error:', error);
    return NextResponse.json({ error: 'Failed to create Merchant Page' }, { status: 500 });
  }
}
