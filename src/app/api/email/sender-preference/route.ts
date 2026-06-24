import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PROVIDER = 'email_sender_preference';

// GET /api/email/sender-preference — get the globally saved sender
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('integration_settings')
      .select('credentials')
      .eq('provider', PROVIDER)
      .maybeSingle();

    const creds = (data?.credentials as Record<string, string>) ?? {};
    return NextResponse.json({
      senderEmail: creds.senderEmail ?? '',
      senderName: creds.senderName ?? '',
    });
  } catch (err) {
    console.error('[SENDER PREF] GET error:', err);
    return NextResponse.json({ senderEmail: '', senderName: '' });
  }
}

// POST /api/email/sender-preference — save the globally preferred sender
export async function POST(req: NextRequest) {
  try {
    const { senderEmail, senderName } = await req.json() as { senderEmail: string; senderName: string };
    if (!senderEmail) return NextResponse.json({ error: 'senderEmail is required' }, { status: 400 });

    const supabase = await createClient();
    await supabase
      .from('integration_settings')
      .upsert(
        {
          provider: PROVIDER,
          credentials: { senderEmail, senderName: senderName ?? '' },
          connected: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider' }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[SENDER PREF] POST error:', err);
    return NextResponse.json({ error: 'Failed to save sender preference' }, { status: 500 });
  }
}
