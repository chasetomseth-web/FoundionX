import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session) return unauthorizedResponse();

    let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) store = await prisma.store.findFirst();

    const funnels = await prisma.upsell_funnels.findMany({
      include: {
        funnel_steps: {
          orderBy: { step_order: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ funnels });
  } catch (error) {
    console.error('[UPSELL FUNNELS] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch funnels' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session) return unauthorizedResponse();

    let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) store = await prisma.store.findFirst();

    const body = await req.json();
    const { name, description, trigger_product_id, is_active = true, steps = [] } = body;

    if (!name) {
      return NextResponse.json({ error: 'Funnel name is required' }, { status: 400 });
    }

    // Create funnel
    const funnel = await prisma.upsell_funnels.create({
      data: {
        name,
        description,
        trigger_product_id,
        is_active,
      },
    });

    // Create steps if provided
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
        funnel_id: funnel.id,
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

    // Return full funnel with steps
    const fullFunnel = await prisma.upsell_funnels.findUnique({
      where: { id: funnel.id },
      include: {
        funnel_steps: {
          orderBy: { step_order: 'asc' },
        },
      },
    });

    return NextResponse.json({ funnel: fullFunnel }, { status: 201 });
  } catch (error) {
    console.error('[UPSELL FUNNELS] POST error:', error);
    return NextResponse.json({ error: 'Failed to create funnel' }, { status: 500 });
  }
}