'use server';

import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) return NextResponse.json({ error: 'SalesBlink not connected' }, { status: 401 });

    const [sentRes, opensRes, clicksRes, repliesRes] = await Promise.all([
      fetch(`${SALESBLINK_BASE}/sent?per_page=100&page=1`, { headers: { Authorization: apiKey } }),
      fetch(`${SALESBLINK_BASE}/opens?per_page=100&page=1`, { headers: { Authorization: apiKey } }),
      fetch(`${SALESBLINK_BASE}/clicks?per_page=100&page=1`, { headers: { Authorization: apiKey } }),
      fetch(`${SALESBLINK_BASE}/replies?per_page=100&page=1`, { headers: { Authorization: apiKey } }),
    ]);

    const [sent, opens, clicks, replies] = await Promise.all([
      sentRes.ok ? sentRes.json() : { data: [] },
      opensRes.ok ? opensRes.json() : { data: [] },
      clicksRes.ok ? clicksRes.json() : { data: [] },
      repliesRes.ok ? repliesRes.json() : { data: [] },
    ]);

    const totalSent = sent?.data?.length || 0;
    const totalOpens = opens?.data?.length || 0;
    const totalClicks = clicks?.data?.length || 0;
    const totalReplies = replies?.data?.length || 0;

    return NextResponse.json({
      totalSent,
      totalOpens,
      totalClicks,
      totalReplies,
      openRate: totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0.0',
      clickRate: totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0',
      replyRate: totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0.0',
      recentSent: sent?.data?.slice(0, 10) || [],
      recentReplies: replies?.data?.slice(0, 10) || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
