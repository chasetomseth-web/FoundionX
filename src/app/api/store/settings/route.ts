import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * GET /api/store/settings — Fetch store settings (ship-from address, pixels, etc.)
 * PATCH /api/store/settings — Update store settings
 */
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await prisma.store.findFirst({
    where: { organizationId: auth.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      timezone: true,
      domain: true,
      customDomain: true,
      fromAddressName: true,
      fromAddressStreet: true,
      fromAddressCity: true,
      fromAddressState: true,
      fromAddressZip: true,
      fromAddressCountry: true,
      fromAddressPhone: true,
      gtmId: true,
      facebookPixelId: true,
      tiktokPixelId: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  return NextResponse.json({ store });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await prisma.store.findFirst({
    where: { organizationId: auth.organizationId },
  });

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  // Allowed fields that can be updated
  const allowed = [
    'name', 'currency', 'timezone', 'domain', 'customDomain',
    'fromAddressName', 'fromAddressStreet', 'fromAddressCity',
    'fromAddressState', 'fromAddressZip', 'fromAddressCountry', 'fromAddressPhone',
    'gtmId', 'facebookPixelId', 'tiktokPixelId',
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      data[key] = body[key] === '' ? null : body[key];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  const updated = await prisma.store.update({
    where: { id: store.id },
    data,
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      timezone: true,
      domain: true,
      customDomain: true,
      fromAddressName: true,
      fromAddressStreet: true,
      fromAddressCity: true,
      fromAddressState: true,
      fromAddressZip: true,
      fromAddressCountry: true,
      fromAddressPhone: true,
      gtmId: true,
      facebookPixelId: true,
      tiktokPixelId: true,
    },
  });

  return NextResponse.json({ store: updated });
}