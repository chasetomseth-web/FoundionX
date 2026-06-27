import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSubscriptionEmailEvents, getSubscriptionEmailStats } from '@/lib/email/email-tracking';

export const runtime = 'nodejs';
export async function GET(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const subscriptionId = params.subscriptionId;
    const { searchParams } = new URL(request.url);
    const includeEmailStats = searchParams.get('includeEmailStats') === 'true';
    const includeEmailEvents = searchParams.get('includeEmailEvents') === 'true';

    // Get the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        retryAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const response: any = {
      subscription,
    };

    // Include email stats if requested
    if (includeEmailStats) {
      response.emailStats = await getSubscriptionEmailStats(subscriptionId);
    }

    // Include email events if requested
    if (includeEmailEvents) {
      response.emailEvents = await getSubscriptionEmailEvents(subscriptionId);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const subscriptionId = params.subscriptionId;
    const body = await request.json();

    // Allow updating certain fields
    const allowedFields = ['metadata', 'emailPreferences'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription', details: error.message },
      { status: 500 }
    );
  }
}
