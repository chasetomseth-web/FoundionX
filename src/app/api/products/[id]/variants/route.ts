import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// GET — list all variants for the product
export const runtime = 'nodejs';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!hasPermission(auth, 'products:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: productId } = params;

    // Verify product belongs to user's organization
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product || product.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ variants });
  } catch (error: unknown) {
    console.error('Get variants error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get variants';
    return NextResponse.json(
      { error: 'GET_VARIANTS_FAILED', message },
      { status: 500 }
    );
  }
}

// POST — create a new variant
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!hasPermission(auth, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: productId } = params;
    const body = await request.json();

    // Verify product belongs to user's organization
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product || product.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name: body.name,
        sku: body.sku,
        price: body.price,
        compareAtPrice: body.compareAtPrice,
        inventory: body.inventory || 0,
        weight: body.weight,
        imageUrl: body.imageUrl,
        options: body.options,
        active: body.active !== false,
      },
    });

    return NextResponse.json({ variant });
  } catch (error: unknown) {
    console.error('Create variant error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create variant';
    return NextResponse.json(
      { error: 'CREATE_VARIANT_FAILED', message },
      { status: 500 }
    );
  }
}

// PATCH — bulk update variants array
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!hasPermission(auth, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: productId } = params;
    const body = await request.json();
    const { variants } = body;

    // Verify product belongs to user's organization
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product || product.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update all variants
    const updates = await Promise.all(
      variants.map((variant: any) => {
        if (variant.id) {
          // Update existing variant
          return prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              name: variant.name,
              sku: variant.sku,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              inventory: variant.inventory,
              weight: variant.weight,
              imageUrl: variant.imageUrl,
              options: variant.options,
              active: variant.active,
            },
          });
        } else {
          // Create new variant
          return prisma.productVariant.create({
            data: {
              productId,
              name: variant.name,
              sku: variant.sku,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              inventory: variant.inventory || 0,
              weight: variant.weight,
              imageUrl: variant.imageUrl,
              options: variant.options,
              active: variant.active !== false,
            },
          });
        }
      })
    );

    return NextResponse.json({ variants: updates });
  } catch (error: unknown) {
    console.error('Update variants error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update variants';
    return NextResponse.json(
      { error: 'UPDATE_VARIANTS_FAILED', message },
      { status: 500 }
    );
  }
}

// DELETE — delete single variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!hasPermission(auth, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: productId } = params;
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');

    if (!variantId) {
      return NextResponse.json(
        { error: 'variantId is required' },
        { status: 400 }
      );
    }

    // Verify product belongs to user's organization
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product || product.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete variant error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete variant';
    return NextResponse.json(
      { error: 'DELETE_VARIANT_FAILED', message },
      { status: 500 }
    );
  }
}
