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
    const type = searchParams.get('type') || 'all';
    const sequenceId = searchParams.get('sequence_id') || '';
    const email = searchParams.get('email') || '';
    const perPage = searchParams.get('per_page') || '50';
    const page = searchParams.get('page') || '1';

    function buildUrl(endpoint: string) {
      const params = new URLSearchParams({ per_page: perPage, page });
      if (sequenceId) params.set('sequence_id', sequenceId);
      if (email) params.set('recipient_email_address', email);
      return `${SALESBLINK_BASE}/${endpoint}?${params.toString()}`;
    }

    if (type === 'sent') {
      const res = await fetch(buildUrl('sent'), { headers: { Authorization: apiKey } });
      const data = await res.json();
      return NextResponse.json({ type: 'sent', ...(res.ok ? data : { data: [], error: data?.message }) });
    }
    if (type === 'opens') {
      const res = await fetch(buildUrl('opens'), { headers: { Authorization: apiKey } });
      const data = await res.json();
      return NextResponse.json({ type: 'opens', ...(res.ok ? data : { data: [], error: data?.message }) });
    }
    if (type === 'clicks') {
      const res = await fetch(buildUrl('clicks'), { headers: { Authorization: apiKey } });
      const data = await res.json();
      return NextResponse.json({ type: 'clicks', ...(res.ok ? data : { data: [], error: data?.message }) });
    }
    if (type === 'replies') {
      const res = await fetch(buildUrl('replies'), { headers: { Authorization: apiKey } });
      const data = await res.json();
      return NextResponse.json({ type: 'replies', ...(res.ok ? data : { data: [], error: data?.message }) });
    }

    // type === 'all' — fetch all in parallel
    const [sentRes, opensRes, clicksRes, repliesRes] = await Promise.all([
      fetch(buildUrl('sent'), { headers: { Authorization: apiKey } }),
      fetch(buildUrl('opens'), { headers: { Authorization: apiKey } }),
      fetch(buildUrl('clicks'), { headers: { Authorization: apiKey } }),
      fetch(buildUrl('replies'), { headers: { Authorization: apiKey } }),
    ]);

    const [sent, opens, clicks, replies] = await Promise.all([
      sentRes.ok ? sentRes.json() : { data: [] },
      opensRes.ok ? opensRes.json() : { data: [] },
      clicksRes.ok ? clicksRes.json() : { data: [] },
      repliesRes.ok ? repliesRes.json() : { data: [] },
    ]);

    return NextResponse.json({ sent: sent?.data || [], opens: opens?.data || [], clicks: clicks?.data || [], replies: replies?.data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
