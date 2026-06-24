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

    const res = await fetch(`${SALESBLINK_BASE}/tasks?limit=${limit}&skip=${skip}`, {
      headers: { Authorization: apiKey },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.message || 'Failed to fetch tasks' }, { status: res.status });
    return NextResponse.json(data);
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
    const res = await fetch(`${SALESBLINK_BASE}/tasks`, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.message || 'Failed to create task' }, { status: res.status });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return NextResponse.json({ error: 'SalesBlink not connected' }, { status: 401 });

    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    const res = await fetch(`${SALESBLINK_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.message || 'Failed to update task' }, { status: res.status });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
