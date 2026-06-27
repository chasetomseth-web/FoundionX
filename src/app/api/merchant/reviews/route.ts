import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// GET — all reviews for merchant's store
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!hasPermission(auth, 'products:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const approvedFilter = searchParams.get('approved');

    // Get user's stores
    const stores = await prisma.store.findMany({
      where: { organizationId: auth.organizationId },
      select: { id: true },
    });

    const storeIds = stores.map((s) => s.id);

    const where: any = {
      storeId: { in: storeIds },
    };

    if (approvedFilter === 'false') {
      where.approved = false;
    } else if (approvedFilter === 'true') {
      where.approved = true;
    }

    const reviews = await prisma.productReview.findMany({
      where,
      include: {
        product: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reviews });
  } catch (error: unknown) {
    console.error('Get merchant reviews error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get reviews';
    return NextResponse.json(
      { error: 'GET_REVIEWS_FAILED', message },
      { status: 500 }
    );
  }
}

// PATCH — update review approval status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!hasPermission(auth, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { reviewId, approved } = body;

    if (!reviewId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'reviewId and approved are required' },
        { status: 400 }
      );
    }

    // Verify review belongs to user's store
    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
      include: { store: true },
    });

    if (!review || review.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const updatedReview = await prisma.productReview.update({
      where: { id: reviewId },
      data: { approved },
    });

    return NextResponse.json({ review: updatedReview });
  } catch (error: unknown) {
    console.error('Update review error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update review';
    return NextResponse.json(
      { error: 'UPDATE_REVIEW_FAILED', message },
      { status: 500 }
    );
  }
}

// DELETE — delete a review
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!hasPermission(auth, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 }
      );
    }

    // Verify review belongs to user's store
    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
      include: { store: true },
    });

    if (!review || review.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await prisma.productReview.delete({
      where: { id: reviewId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete review error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete review';
    return NextResponse.json(
      { error: 'DELETE_REVIEW_FAILED', message },
      { status: 500 }
    );
  }
}
