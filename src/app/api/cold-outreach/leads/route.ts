'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SALESBLINK_BASE = 'https://run.salesblink.io/api/public/v1.0.0';

async function getApiKey(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integration_settings')
    .select('credentials')
    .eq('provider', 'salesblink')
    .single();
  return (data?.credentials as Record<string, string>)?.apiKey || null;
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return NextResponse.json({ error: 'SalesBlink not connected' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '50';
    const skip = searchParams.get('skip') || '0';

    // Fetch lists
    const listsRes = await fetch(`${SALESBLINK_BASE}/lists?limit=${limit}&skip=${skip}`, {
      headers: { Authorization: apiKey },
    });
    const listsData = await listsRes.json();
    if (!listsRes.ok) return NextResponse.json({ error: listsData?.message || 'Failed to fetch lists' }, { status: listsRes.status });

    return NextResponse.json(listsData);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return NextResponse.json({ error: 'SalesBlink not connected' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === 'create_list') {
      const res = await fetch(`${SALESBLINK_BASE}/lists`, {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: body.name }),
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data?.message || 'Failed to create list' }, { status: res.status });
      return NextResponse.json(data);
    }

    if (action === 'add_contacts') {
      const res = await fetch(`${SALESBLINK_BASE}/contacts`, {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: body.contacts, listId: body.listId }),
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data?.message || 'Failed to add contacts' }, { status: res.status });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
