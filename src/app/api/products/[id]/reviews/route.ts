import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET — returns approved reviews
export const runtime = 'nodejs';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: productId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const reviews = await prisma.productReview.findMany({
      where: {
        productId,
        approved: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.productReview.count({
      where: { productId, approved: true },
    });

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Get reviews error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get reviews';
    return NextResponse.json(
      { error: 'GET_REVIEWS_FAILED', message },
      { status: 500 }
    );
  }
}

// POST — create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: productId } = params;
    const body = await request.json();
    const { customerEmail, customerName, rating, title, bodyText } = body;

    if (!customerEmail || !customerName || !rating) {
      return NextResponse.json(
        { error: 'customerEmail, customerName, and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify that customer has purchased this product
    const order = await prisma.order.findFirst({
      where: {
        customer: { email: customerEmail },
        paymentStatus: 'paid',
        items: {
          some: { productId },
        },
      },
    });

    const verified = !!order;

    // Get storeId from product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { storeId: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const review = await prisma.productReview.create({
      data: {
        productId,
        storeId: product.storeId,
        customerEmail,
        customerName,
        rating,
        title,
        body: bodyText,
        verified,
        approved: false, // Requires merchant approval
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Review submitted and pending approval.',
      review,
    });
  } catch (error: unknown) {
    console.error('Create review error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create review';
    return NextResponse.json(
      { error: 'CREATE_REVIEW_FAILED', message },
      { status: 500 }
    );
  }
}
