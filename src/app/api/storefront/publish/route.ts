import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { publishStorefront, invalidateStorefrontCache, getStorefrontStatus } from '@/lib/storefront-publisher';
import { prisma } from '@/lib/prisma';

// GET /api/storefront/publish — get publish status
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const status = await getStorefrontStatus(store.id);
    return NextResponse.json({ status });
  } catch (error) {
    console.error('[STOREFRONT PUBLISH] GET error:', error);
    return NextResponse.json({ error: 'Failed to get storefront status' }, { status: 500 });
  }
}

// POST /api/storefront/publish — publish a template
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { templateId, mode = 'production', action } = body;

    const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    if (action === 'invalidate_cache') {
      await invalidateStorefrontCache(store.id, body.slug);
      return NextResponse.json({ success: true, message: 'Cache invalidated' });
    }

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const result = await publishStorefront(
      store.id,
      templateId,
      mode,
      session.organizationId,
      session.userId
    );

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[STOREFRONT PUBLISH] POST error:', error);
    const message = error instanceof Error ? error.message : 'Publish failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
