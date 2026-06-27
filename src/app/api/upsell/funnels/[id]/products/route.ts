import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export const runtime = 'nodejs';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'products:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id: funnelId } = await params;
    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Verify funnel exists
    const funnel = await prisma.upsell_funnels.findUnique({ where: { id: funnelId } });
    if (!funnel) {
      return NextResponse.json({ error: 'Funnel not found' }, { status: 404 });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get max sort order
    const lastProduct = await prisma.funnelProduct.findFirst({
      where: { funnelId },
      orderBy: { sortOrder: 'desc' },
    });

    const fp = await prisma.funnelProduct.create({
      data: {
        funnelId,
        productId,
        sortOrder: (lastProduct?.sortOrder ?? -1) + 1,
      },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        },
      },
    });

    return NextResponse.json({ funnelProduct: fp }, { status: 201 });
  } catch (error) {
    console.error('[FUNNEL PRODUCTS] POST error:', error);
    // Handle unique constraint violation
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Product already in this funnel' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add product to funnel' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'products:delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id: funnelId } = await params;
    const { searchParams } = req.nextUrl;
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId query parameter is required' }, { status: 400 });
    }

    const fp = await prisma.funnelProduct.findUnique({
      where: { funnelId_productId: { funnelId, productId } },
    });

    if (!fp) {
      return NextResponse.json({ error: 'Product not found in funnel' }, { status: 404 });
    }

    await prisma.funnelProduct.delete({
      where: { id: fp.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FUNNEL PRODUCTS] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove product from funnel' }, { status: 500 });
  }
}