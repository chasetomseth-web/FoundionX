import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'products:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const collectionId = searchParams.get('collectionId');

  // Bypass-compatible store lookup
  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst();
  if (!store) return NextResponse.json({ products: [], total: 0 });

  const where: Record<string, unknown> = { storeId: store.id };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (type) where.type = type;
  if (collectionId) {
    where.collections = { some: { collectionId } };
  }

  if (status) {
    where.status = status;
  } else {
    where.status = { not: 'archived' };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        inventory: true,
        tags: true,
        collections: { include: { collection: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'products:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    console.log('[POST /api/products] body.name:', JSON.stringify(body.name), 'full body:', JSON.stringify(body))
    if (!body.name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    // Bypass-compatible store lookup
    let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) store = await prisma.store.findFirst();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // Accept explicit storeId from body (e.g. from wizard funnel context)
    if (body.storeId) {
      const explicitStore = await prisma.store.findUnique({ where: { id: body.storeId } });
      if (explicitStore) store = explicitStore;
    }

    const slug = body.slug ?? (body.name ? body.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now() : `product-${Date.now()}`);

    // Step 1: Create product with scalar fields only (avoid nested writes on cold start)
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        name: body.name,
        slug,
        sku: body.sku,
        description: body.description,
        price: body.price ?? 0,
        compareAtPrice: body.compareAtPrice,
        costPrice: body.costPrice,
        type: body.type ?? 'physical',
        status: body.status ?? 'draft',
        taxable: body.taxable ?? true,
        weight: body.weight,
        hasUpsell: body.hasUpsell ?? false,
        hasOrderBump: body.hasOrderBump ?? false,
        metadata: body.metadata ?? {},
      },
    });

    // Step 2: Handle relations in parallel (separate quick queries)
    const tagCreates = (body.tags ?? []).map((tag: string) => 
      prisma.productTag.create({
        data: { productId: product.id, tag },
      })
    );
    await Promise.all([
      body.imageUrl ? prisma.productImage.create({
        data: { productId: product.id, url: body.imageUrl, sortOrder: 0 },
      }) : Promise.resolve(),
      body.trackInventory ? prisma.inventory.create({
        data: { productId: product.id, quantity: body.inventory ?? 0, available: body.inventory ?? 0, trackInventory: true },
      }) : Promise.resolve(),
    ].concat(tagCreates));

    // Step 3: Fetch final product with includes
    const finalProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { images: true, inventory: true, tags: true },
    });

    // Non-critical audit log — swallow foreign key violations so product creation never fails
    prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        action: 'product.created',
        resource: 'product',
        resourceId: product.id,
      },
    }).catch((err) => {
      if (err?.code === 'P2003') {
        console.warn('[auditLog] Foreign key violation (user may be auth UID, not internal ID):', err.message);
      } else {
        console.error('[auditLog] Unexpected error:', err);
      }
    });

    return NextResponse.json({ product: finalProduct }, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}