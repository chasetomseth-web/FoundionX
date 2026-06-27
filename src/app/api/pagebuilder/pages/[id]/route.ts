import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export const runtime = 'nodejs';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const page = await prisma.merchantPage.findUnique({ where: { id: params.id } });
  if (!page || page.storeId !== store.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ page });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const body = await req.json();
    const allowed = ['html', 'css', 'js', 'name', 'slug', 'seoTitle', 'seoDesc', 'isPublished', 'visibility'];
    const data: Record<string, any> = {};
    for (const k of allowed) if (k in body) data[k] = body[k];

    // If slug provided, ensure uniqueness within store
    if (data.slug) {
      const cleanSlug = data.slug.startsWith('/') ? data.slug : `/${data.slug}`;
      const existing = await prisma.merchantPage.findUnique({ where: { storeId_slug: { storeId: store.id, slug: cleanSlug } } });
      if (existing && existing.id !== params.id) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
      data.slug = cleanSlug;
    }

    const page = await prisma.merchantPage.findUnique({ where: { id: params.id } });
    if (!page || page.storeId !== store.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.merchantPage.update({ where: { id: params.id }, data });
    return NextResponse.json({ page: updated });
  } catch (error) {
    console.error('[PAGEBUILDER_PAGES] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst(); // fallback for dev/bypass auth
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const page = await prisma.merchantPage.findUnique({ where: { id: params.id } });
  if (!page || page.storeId !== store.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (page.isCore) return NextResponse.json({ error: 'Cannot delete core page' }, { status: 403 });

  await prisma.merchantPage.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
