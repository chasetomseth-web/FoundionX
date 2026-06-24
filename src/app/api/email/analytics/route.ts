import { NextRequest, NextResponse } from 'next/server';
import { getBrevoApiKey } from '@/lib/integration-settings';

const BREVO_API = 'https://api.brevo.com/v3';

async function brevo<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${BREVO_API}${path}`, {
    headers: { 'api-key': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo ${res.status}: ${err}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    // Fetch campaigns with stats
    const campaignsData = await brevo<{ campaigns: BrevoEmailCampaign[]; count: number }>(
      '/emailCampaigns?limit=50&sort=desc&statistics=globalStats',
      apiKey
    );

    const campaigns = campaignsData.campaigns ?? [];

    // Aggregate stats
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;
    let totalUnsubscribed = 0;

    for (const c of campaigns) {
      const stats = c.statistics?.globalStats ?? {};
      totalSent += stats.sent ?? 0;
      totalDelivered += stats.delivered ?? 0;
      totalOpened += stats.uniqueViews ?? 0;
      totalClicked += stats.uniqueClicks ?? 0;
      totalBounced += (stats.hardBounces ?? 0) + (stats.softBounces ?? 0);
      totalUnsubscribed += stats.unsubscriptions ?? 0;
    }

    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    const unsubRate = totalDelivered > 0 ? (totalUnsubscribed / totalDelivered) * 100 : 0;

    // Top performing campaigns by open rate
    const topCampaigns = campaigns
      .filter((c) => (c.statistics?.globalStats?.sent ?? 0) > 0)
      .map((c) => {
        const stats = c.statistics?.globalStats ?? {};
        const sent = stats.sent ?? 0;
        const opened = stats.uniqueViews ?? 0;
        const clicked = stats.uniqueClicks ?? 0;
        return {
          id: c.id,
          name: c.name,
          subject: c.subject,
          status: c.status,
          sentAt: c.sentDate,
          sent,
          delivered: stats.delivered ?? 0,
          opened,
          clicked,
          bounced: (stats.hardBounces ?? 0) + (stats.softBounces ?? 0),
          unsubscribed: stats.unsubscriptions ?? 0,
          openRate: sent > 0 ? (opened / sent) * 100 : 0,
          clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
        };
      })
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalUnsubscribed,
        openRate: parseFloat(openRate.toFixed(2)),
        clickRate: parseFloat(clickRate.toFixed(2)),
        bounceRate: parseFloat(bounceRate.toFixed(2)),
        unsubRate: parseFloat(unsubRate.toFixed(2)),
        totalCampaigns: campaigns.length,
      },
      topCampaigns,
      recentCampaigns: campaigns.slice(0, 10).map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        sentAt: c.sentDate,
        sent: c.statistics?.globalStats?.sent ?? 0,
        openRate: (() => {
          const s = c.statistics?.globalStats?.sent ?? 0;
          const o = c.statistics?.globalStats?.uniqueViews ?? 0;
          return s > 0 ? parseFloat(((o / s) * 100).toFixed(1)) : 0;
        })(),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch analytics' }, { status: 500 });
  }
}

interface BrevoEmailCampaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  sentDate: string | null;
  statistics?: {
    globalStats?: {
      sent?: number;
      delivered?: number;
      uniqueViews?: number;
      uniqueClicks?: number;
      hardBounces?: number;
      softBounces?: number;
      unsubscriptions?: number;
    };
  };
}
