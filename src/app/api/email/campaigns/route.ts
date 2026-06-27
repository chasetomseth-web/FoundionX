import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { getCampaigns } from '@/lib/brevo';

// GET /api/email/campaigns
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'email:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Fetch from Brevo
    const brevoCampaigns = await getCampaigns('email');

    // Sync to local DB
    const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (store) {
      for (const campaign of brevoCampaigns.campaigns ?? []) {
        const c = campaign as Record<string, unknown>;
        await prisma.emailCampaign.upsert({
          where: { brevoCampaignId: c.id as number },
          create: {
            storeId: store.id,
            name: c.name as string,
            subject: (c.subject as string) ?? undefined,
            type: 'broadcast',
            status: (c.status as string) ?? 'sent',
            brevoCampaignId: c.id as number,
            sentAt: c.sentDate ? new Date(c.sentDate as string) : undefined,
            recipientCount: (c.recipients as Record<string, unknown>)?.listRecipients as number ?? 0,
            openCount: (c.statistics as Record<string, unknown>)?.globalStats as Record<string, unknown> ? 0 : 0,
          },
          update: {
            status: (c.status as string) ?? 'sent',
          },
        });
      }
    }

    // Return local campaigns
    const campaigns = await prisma.emailCampaign.findMany({
      where: store ? { storeId: store.id } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('[EMAIL] Campaigns fetch error:', error);
    // Fallback to local DB only
    const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    const campaigns = store
      ? await prisma.emailCampaign.findMany({ where: { storeId: store.id }, orderBy: { createdAt: 'desc' } })
      : [];
    return NextResponse.json({ campaigns });
  }
}
