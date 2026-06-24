import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { triggerAutomationEvent } from '@/lib/brevo';

// POST /api/email/trigger
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { event, email, props } = body;

    if (!event || !email) {
      return NextResponse.json({ error: 'event and email are required' }, { status: 400 });
    }

    await triggerAutomationEvent(email, event, props ?? {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EMAIL] Trigger error:', error);
    return NextResponse.json({ error: 'Failed to trigger automation' }, { status: 500 });
  }
}
