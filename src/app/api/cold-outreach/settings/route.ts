'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SALESBLINK_BASE = 'https://run.salesblink.io/api/public/v1.0.0';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('integration_settings')
      .select('credentials, connected')
      .eq('provider', 'salesblink')
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const apiKey = (data?.credentials as Record<string, string>)?.apiKey || null;
    let connected = false;
    let accountInfo = null;

    if (apiKey) {
      try {
        const res = await fetch(`${SALESBLINK_BASE}/sequences?limit=1`, {
          headers: { Authorization: apiKey },
        });
        connected = res.ok;
        if (res.ok) {
          const json = await res.json();
          accountInfo = json?.data || null;
        }
      } catch {
        connected = false;
      }
    }

    return NextResponse.json({
      hasKey: !!apiKey,
      maskedKey: apiKey
        ? `${apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, apiKey.length - 12))}${apiKey.slice(-4)}`
        : null,
      connected,
      accountInfo,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Validate key against SalesBlink using /sequences endpoint
    const testRes = await fetch(`${SALESBLINK_BASE}/sequences?limit=1`, {
      headers: { Authorization: apiKey },
    });

    if (!testRes.ok) {
      let errMsg = 'Invalid API key — SalesBlink rejected it';
      try {
        const errData = await testRes.json();
        if (errData?.message) errMsg = errData.message;
      } catch { /* ignore */ }
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('integration_settings')
      .upsert(
        {
          provider: 'salesblink',
          credentials: { apiKey },
          connected: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, connected: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('integration_settings')
      .delete()
      .eq('provider', 'salesblink');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
