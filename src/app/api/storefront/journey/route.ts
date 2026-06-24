import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// GET /api/storefront/journey — get current journey order
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const store = await prisma.store.findFirst({
    where: { organizationId: session.organizationId },
    select: { id: true, journeySteps: true },
  });
  if (!store) return NextResponse.json({ steps: [] });

  // journeySteps may be an array (journey builder) or an object (onboarding metadata).
  // Normalize to always return an array of journey steps.
  const raw = store.journeySteps;
  let steps: unknown[] = [];
  if (Array.isArray(raw)) {
    steps = raw;
  } else if (raw && typeof raw === 'object') {
    // If it has onboarding metadata, extract the steps array or return default required steps
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.steps)) {
      steps = obj.steps;
    } else if (Array.isArray(obj.journey)) {
      steps = obj.journey;
    }
  }

  return NextResponse.json({ steps });
}

// POST /api/storefront/journey — save journey order
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'settings:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const store = await prisma.store.findFirst({
    where: { organizationId: session.organizationId },
  });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const body = await req.json();
    const { steps } = body;

    if (!Array.isArray(steps)) {
      return NextResponse.json({ error: 'steps must be an array' }, { status: 400 });
    }

    await prisma.store.update({
      where: { id: store.id },
      data: { journeySteps: steps },
    });

    return NextResponse.json({ steps });
  } catch (error) {
    console.error('[STOREFRONT_JOURNEY] POST error:', error);
    return NextResponse.json({ error: 'Failed to save journey' }, { status: 500 });
  }
}