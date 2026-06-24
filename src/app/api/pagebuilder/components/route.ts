import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ components: [] });

  const components = await prisma.siteComponent.findMany({ where: { storeId: store.id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ components });
}
