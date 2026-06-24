import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { goaffproService } from '@/lib/goaffpro';

// POST /api/affiliates/sync — sync affiliates from GoAffPro
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'affiliates:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    if (!store.goaffproApiKey) {
      return NextResponse.json({ error: 'GoAffPro not configured. Add your API key in Settings.' }, { status: 400 });
    }

    const result = await goaffproService.syncAffiliatesFromGoAffPro(
      { accessToken: store.goaffproApiKey, storeId: store.goaffproStoreId ?? undefined },
      store.id
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[AFFILIATES] Sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
