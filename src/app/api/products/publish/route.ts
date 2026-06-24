import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

/**
 * POST /api/products/publish
 * Publishes a product and activates its associated funnel.
 * Optionally triggers fulfillment provisioning as a background job.
 */
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { productId, funnelId, funnelName, funnelSteps } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // 1) Update product status to active
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'active',
        publishedAt: new Date(),
      },
      select: { id: true, slug: true, type: true, storeId: true, name: true },
    });

    // 2) If funnelId exists, upsert the funnel steps
    let publishedFunnel = null;
    if (funnelId && Array.isArray(funnelSteps) && funnelSteps.length > 0) {
      const upsellSteps = funnelSteps.filter(
        (s: any) => s.type === 'upsell' || s.type === 'downsell' || s.type === 'order_bump' || s.type === 'cross_sell'
      );

      if (upsellSteps.length > 0) {
        publishedFunnel = await prisma.upsell_funnels.update({
          where: { id: funnelId },
          data: {
            is_active: true,
            trigger_product_id: productId,
            ...(funnelName ? { name: funnelName } : {}),
          },
        });

        // Delete existing steps and recreate
        await prisma.funnel_steps.deleteMany({
          where: { funnel_id: funnelId },
        });

        const stepsData = upsellSteps.map((s: any, idx: number) => ({
          funnel_id: funnelId,
          step_order: idx + 1,
          step_type: s.type ?? 'upsell',
          name: s.name ?? `Step ${idx + 1}`,
          price_cents: Math.round(parseFloat(s.price ?? '0') * 100) || 0,
          currency: s.currency ?? 'usd',
          html_content: s.pageTemplate ?? null,
          decline_next_step_order: s.declineNextStep != null ? parseInt(s.declineNextStep) : null,
          accept_next_step_order: s.acceptNextStep != null ? parseInt(s.acceptNextStep) : null,
          stripe_price_id: s.stripePriceId ?? null,
        }));

        await prisma.funnel_steps.createMany({ data: stepsData });
      }
    }

    // 3) Queue fulfillment provisioning as a background job if digital product
    if (product.type === 'digital' || product.type === 'subscription') {
      try {
        await prisma.backgroundJob.create({
          data: {
            queue: 'fulfillment',
            jobType: 'provision_digital_product',
            payload: {
              productId: product.id,
              storeId: product.storeId,
              productType: product.type,
              publishedAt: new Date().toISOString(),
            },
            status: 'pending',
            scheduledAt: new Date(),
            maxAttempts: 3,
          },
        });
      } catch (jobErr) {
        // Non-fatal - don't fail the publish if job enqueue fails
        console.warn('[PUBLISH] Failed to enqueue fulfillment job:', jobErr);
      }
    }

    // 4) Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        action: 'product.published',
        resource: 'product',
        resourceId: productId,
        metadata: {
          productId,
          funnelId,
          productType: product.type,
          hasFunnel: !!publishedFunnel,
        },
      },
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        slug: product.slug,
        status: 'active',
        publishedAt: new Date(),
      },
      funnel: publishedFunnel,
    });
  } catch (error) {
    console.error('[PUBLISH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish product' },
      { status: 500 }
    );
  }
}