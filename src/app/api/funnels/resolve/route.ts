import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/funnels/resolve?slug=xxx&after_payment=true
// Returns the first upsell step URL after payment for funnel-based checkouts
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get('slug');
  const afterPayment = searchParams.get('after_payment') === 'true';

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const funnel = await prisma.funnel.findFirst({
      where: { slug, status: 'active' },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!funnel || funnel.steps.length === 0) {
      return NextResponse.json({ redirect_url: null });
    }

    if (afterPayment) {
      // After payment, find the first upsell-type step
      // (skip landing/product/checkout steps, find first upsell/downsell/cross_sell)
      const firstUpsellStep = funnel.steps.find(
        (s) => s.type === 'upsell' || s.type === 'downsell' || s.type === 'cross_sell'
      );

      if (firstUpsellStep) {
        return NextResponse.json({
          redirect_url: `/funnel/${slug}/step/${firstUpsellStep.stepOrder}`,
          step_order: firstUpsellStep.stepOrder,
          step_type: firstUpsellStep.type,
        });
      }
    }

    return NextResponse.json({ redirect_url: null });
  } catch (error) {
    console.error('[FUNNELS_RESOLVE] Error:', error);
    return NextResponse.json({ error: 'Failed to resolve funnel' }, { status: 500 });
  }
}