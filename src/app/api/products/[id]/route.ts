import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'products:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  // Bypass-compatible store lookup
  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst();
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      inventory: true,
      tags: true,
      collections: { include: { collection: true } },
    },
  });

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'products:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // Bypass-compatible store lookup
  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst();
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const product = await prisma.product.findFirst({ where: { id, storeId: store.id } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const allowedFields = ['name', 'description', 'price', 'compareAtPrice', 'costPrice', 'status', 'type', 'hasUpsell', 'hasOrderBump', 'sku', 'weight', 'taxable'];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  // Handle metadata merging — merge incoming with existing, don't overwrite entire object
  if (body.metadata !== undefined) {
    const existingMetadata = (product.metadata as Record<string, unknown>) ?? {};
    updateData.metadata = { ...existingMetadata, ...body.metadata };
  }

  // Handle imageUrl — create a product image if provided
  if (body.imageUrl) {
    updateData.images = {
      upsert: {
        where: { id: (await prisma.productImage.findFirst({ where: { productId: id } }))?.id ?? '__none__' },
        create: { url: body.imageUrl, sortOrder: 0 },
        update: { url: body.imageUrl },
      },
    };
  }

  // Handle inventory update
  if (body.inventory !== undefined) {
    const existingInventory = await prisma.inventory.findFirst({ where: { productId: id } });
    if (existingInventory) {
      updateData.inventory = {
        update: {
          quantity: body.inventory,
          available: body.inventory - (body.reserved ?? 0),
        },
      };
    } else {
      updateData.inventory = {
        create: {
          quantity: body.inventory,
          available: body.inventory,
          trackInventory: true,
        },
      };
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { images: true, inventory: true, tags: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'products:delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  // Bypass-compatible store lookup
  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst();
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const product = await prisma.product.findFirst({ where: { id, storeId: store.id } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  await prisma.product.update({
    where: { id },
    data: { status: 'archived' },
  });

  return NextResponse.json({ success: true });
}