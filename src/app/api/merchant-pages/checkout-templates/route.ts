import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'storefront:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Bypass-compatible store lookup
  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst();
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const pages = await prisma.merchantPage.findMany({
    where: {
      storeId: store.id,
      status: { not: 'deleted' },
    },
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ pages });
}
