import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find abandoned carts not yet enrolled in recovery sequence
    const abandonedCarts = await prisma.abandonedCart.findMany({
      where: {
        recoveredAt: null,
        createdAt: { lt: oneHourAgo },
        email: { not: null },
        metadata: {
          path: ['brevoEnrolled'],
          equals: undefined,
        },
      },
      include: {
        store: true,
        product: true,
      },
      take: 100,
    });

    let enrolled = 0;
    const errors: string[] = [];

    for (const cart of abandonedCarts) {
      try {
        // TODO: Fetch abandoned_cart_sequence_id from integration_settings
        // TODO: Call Brevo automations API to enroll customer
        // For now, just mark as enrolled
        
        await prisma.abandonedCart.update({
          where: { id: cart.id },
          data: {
            metadata: {
              ...(cart.metadata as any),
              brevoEnrolled: true,
              enrolledAt: new Date().toISOString(),
            },
          },
        });

        enrolled++;
      } catch (error) {
        errors.push(`Cart ${cart.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: abandonedCarts.length,
      enrolled,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error('Abandoned cart cron error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process abandoned carts';
    return NextResponse.json(
      { error: 'CRON_FAILED', message },
      { status: 500 }
    );
  }
}
