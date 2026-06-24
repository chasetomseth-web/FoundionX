import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PROVIDER = 'email_template_states';

// GET /api/email/template-states — load all template enabled states
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('integration_settings')
      .select('credentials')
      .eq('provider', PROVIDER)
      .maybeSingle();

    const states = (data?.credentials as Record<string, string>) ?? {};
    return NextResponse.json({ states });
  } catch (err) {
    console.error('[TEMPLATE STATES] GET error:', err);
    return NextResponse.json({ states: {} });
  }
}

// POST /api/email/template-states — update a single template's enabled state
export async function POST(req: NextRequest) {
  try {
    const { key, enabled } = await req.json() as { key: string; enabled: boolean };
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

    const supabase = await createClient();

    // Load existing states first
    const { data: existing } = await supabase
      .from('integration_settings')
      .select('credentials')
      .eq('provider', PROVIDER)
      .maybeSingle();

    const current = (existing?.credentials as Record<string, string>) ?? {};
    const updated = { ...current, [key]: enabled ? 'true' : 'false' };

    await supabase
      .from('integration_settings')
      .upsert(
        { provider: PROVIDER, credentials: updated, connected: true, updated_at: new Date().toISOString() },
        { onConflict: 'provider' }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[TEMPLATE STATES] POST error:', err);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}
