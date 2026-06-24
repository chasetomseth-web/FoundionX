import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session) return unauthorizedResponse();

    let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) store = await prisma.store.findFirst();

    const { id } = await params;

    const funnel = await prisma.upsell_funnels.findUnique({
      where: { id },
      include: {
        funnel_steps: {
          orderBy: { step_order: 'asc' },
        },
        funnel_products: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!funnel) {
      return NextResponse.json({ error: 'Funnel not found' }, { status: 404 });
    }

    return NextResponse.json({ funnel });
  } catch (error) {
    console.error('[UPSELL FUNNELS] GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch funnel' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session) return unauthorizedResponse();

    let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) store = await prisma.store.findFirst();

    const { id } = await params;
    const body = await req.json();
    const { name, description, trigger_product_id, is_active, steps } = body;

    // Update funnel
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (trigger_product_id !== undefined) updateData.trigger_product_id = trigger_product_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    await prisma.upsell_funnels.update({
      where: { id },
      data: updateData,
    });

    // Replace steps if provided
    if (Array.isArray(steps)) {
      // Delete existing steps
      await prisma.funnel_steps.deleteMany({
        where: { funnel_id: id },
      });

      if (steps.length > 0) {
        type StepInput = {
          funnel_id: string;
          step_order: number;
          step_type: 'upsell' | 'downsell' | 'cross_sell' | 'order_bump';
          name: string;
          price_cents: number;
          currency: string;
          html_content: string | null;
          decline_next_step_order: number | null;
          accept_next_step_order: number | null;
          stripe_price_id: string | null;
        };

        const stepsData: StepInput[] = steps.map((s: Record<string, unknown>, idx: number) => ({
          funnel_id: id,
          step_order: idx + 1,
          step_type: (s.step_type as 'upsell' | 'downsell' | 'cross_sell' | 'order_bump') ?? 'upsell',
          name: s.name as string,
          price_cents: (s.price_cents as number) ?? 0,
          currency: (s.currency as string) ?? 'usd',
          html_content: (s.html_content as string) ?? null,
          decline_next_step_order: (s.decline_next_step_order as number) ?? null,
          accept_next_step_order: (s.accept_next_step_order as number) ?? null,
          stripe_price_id: (s.stripe_price_id as string) ?? null,
        }));

        await prisma.funnel_steps.createMany({ data: stepsData });
      }
    }

    const funnel = await prisma.upsell_funnels.findUnique({
      where: { id },
      include: {
        funnel_steps: {
          orderBy: { step_order: 'asc' },
        },
      },
    });

    return NextResponse.json({ funnel });
  } catch (error) {
    console.error('[UPSELL FUNNELS] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update funnel' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session) return unauthorizedResponse();

    let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) store = await prisma.store.findFirst();

    const { id } = await params;

    // Step deletion cascades via Prisma relation (onDelete: Cascade)
    await prisma.upsell_funnels.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[UPSELL FUNNELS] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete funnel' }, { status: 500 });
  }
}