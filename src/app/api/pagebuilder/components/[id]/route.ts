import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export const runtime = 'nodejs';
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const body = await req.json();
    const { html } = body;
    const comp = await prisma.siteComponent.findUnique({ where: { id: params.id } });
    if (!comp || comp.storeId !== store.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.siteComponent.update({ where: { id: params.id }, data: { html } });
    return NextResponse.json({ component: updated });
  } catch (error) {
    console.error('[PAGEBUILDER_COMPONENTS] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
  }
}
