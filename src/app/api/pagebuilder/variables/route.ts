import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// GET /api/pagebuilder/variables — return site variables + custom variables
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ siteVariables: [], customVariables: [] });

  const siteVariables = await prisma.siteVariable.findMany({
    where: { storeId: store.id },
    orderBy: { key: 'asc' },
  });

  const customVariables = await prisma.customVariable.findMany({
    where: { storeId: store.id },
    orderBy: { key: 'asc' },
  });

  return NextResponse.json({ siteVariables, customVariables });
}

// PATCH /api/pagebuilder/variables — bulk update site variables
export async function PATCH(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const body = await req.json();
    const updates: Array<{ key: string; value: string }> = body;
    await Promise.all(
      updates.map((u) =>
        prisma.siteVariable.upsert({
          where: { storeId_key: { storeId: store.id, key: u.key } },
          update: { value: u.value },
          create: { storeId: store.id, key: u.key, value: u.value },
        })
      )
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PAGEBUILDER_VARIABLES] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update variables' }, { status: 500 });
  }
}

// POST /api/pagebuilder/variables — create a custom variable
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const body = await req.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

    // Auto-prefix with "variable." if not already prefixed
    const finalKey = key.startsWith('variable.') ? key : `variable.${key}`;

    const variable = await prisma.customVariable.upsert({
      where: { storeId_key: { storeId: store.id, key: finalKey } },
      update: { value: value ?? '' },
      create: {
        storeId: store.id,
        key: finalKey,
        value: value ?? '',
      },
    });

    return NextResponse.json({ variable }, { status: 201 });
  } catch (error) {
    console.error('[PAGEBUILDER_VARIABLES] POST error:', error);
    return NextResponse.json({ error: 'Failed to create variable' }, { status: 500 });
  }
}