import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    // TODO: Verify customer session cookie

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: params.subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Set retention shown flag in metadata
    const metadata = (subscription.metadata as any) || {};
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        metadata: {
          ...metadata,
          retentionShown: true,
          retentionShownAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Retention flag error:', error);
    return NextResponse.json(
      { error: 'Failed to update retention flag', details: error.message },
      { status: 500 }
    );
  }
}
