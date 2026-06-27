import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// DELETE /api/pagebuilder/variables/[id] — delete a custom variable
export const runtime = 'nodejs';
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const variable = await prisma.customVariable.findUnique({ where: { id: params.id } });
    if (!variable || variable.storeId !== store.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.customVariable.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PAGEBUILDER_VARIABLES] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete variable' }, { status: 500 });
  }
}