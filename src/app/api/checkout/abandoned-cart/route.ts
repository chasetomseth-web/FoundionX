import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST — upsert abandoned cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, email, productId, variantId, quantity, metadata } = body;

    if (!storeId || !productId) {
      return NextResponse.json(
        { error: 'storeId and productId are required' },
        { status: 400 }
      );
    }

    // Find existing cart or create new one
    const existing = await prisma.abandonedCart.findFirst({
      where: {
        storeId,
        email,
        productId,
        variantId: variantId || null,
        recoveredAt: null,
      },
    });

    let cart;
    if (existing) {
      // Reset createdAt to trigger new abandonment sequence
      cart = await prisma.abandonedCart.update({
        where: { id: existing.id },
        data: {
          createdAt: new Date(),
          quantity: quantity || 1,
          metadata,
        },
      });
    } else {
      cart = await prisma.abandonedCart.create({
        data: {
          storeId,
          email,
          productId,
          variantId,
          quantity: quantity || 1,
          metadata,
        },
      });
    }

    return NextResponse.json({ id: cart.id });
  } catch (error: unknown) {
    console.error('Abandoned cart upsert error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save abandoned cart';
    return NextResponse.json(
      { error: 'ABANDONED_CART_FAILED', message },
      { status: 500 }
    );
  }
}

// DELETE — mark cart as recovered
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const storeId = searchParams.get('storeId');

    if (!email || !storeId) {
      return NextResponse.json(
        { error: 'email and storeId are required' },
        { status: 400 }
      );
    }

    await prisma.abandonedCart.updateMany({
      where: {
        email,
        storeId,
        recoveredAt: null,
      },
      data: {
        recoveredAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Mark cart recovered error:', error);
    const message = error instanceof Error ? error.message : 'Failed to mark cart as recovered';
    return NextResponse.json(
      { error: 'MARK_RECOVERED_FAILED', message },
      { status: 500 }
    );
  }
}
