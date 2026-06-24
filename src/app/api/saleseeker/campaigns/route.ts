import { NextRequest } from 'next/server';
import { executeRaw, getSaleseekerCampaigns, jsonError, queryMany, requireSaleseekerAuth } from '../lib/saleseeker';
import type { SaleseekerCampaign } from '@/app/tools/saleseeker/types';

interface CampaignPayload {
  name?: string;
  leadIds?: string[];
  tags?: string[];
  niche?: string;
}

function parseCampaignPayload(body: unknown): CampaignPayload | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as CampaignPayload;
  if (typeof value.name !== 'string' || !value.name.trim()) return null;
  return {
    name: value.name.trim(),
    leadIds: Array.isArray(value.leadIds) ? value.leadIds.filter((id): id is string => typeof id === 'string' && id.length > 0) : [],
    tags: Array.isArray(value.tags) ? value.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    niche: typeof value.niche === 'string' ? value.niche.trim() : undefined,
  };
}

export async function GET(req: NextRequest) {
  const authError = await requireSaleseekerAuth(req);
  if (authError) return authError;

  try {
    return new Response(JSON.stringify({ campaigns: await getSaleseekerCampaigns() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load campaigns.';
    return jsonError(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireSaleseekerAuth(req);
  if (authError) return authError;

  const payload = parseCampaignPayload(await req.json().catch(() => null));
  if (!payload) return jsonError('Campaign name is required.', 400);

  try {
    const [campaign] = await queryMany<SaleseekerCampaign>(
      `INSERT INTO saleseeker_campaigns (id, name, niche, tags, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3::TEXT[], now())
       RETURNING id, name, niche, tags, created_at::text`,
      [payload.name, payload.niche || null, payload.tags]
    );

    if ((payload.leadIds ?? []).length > 0) {
      await executeRaw(
        `UPDATE saleseeker_leads
         SET campaign_id = $1
         WHERE id = ANY($2::UUID[])`,
        [campaign.id, payload.leadIds ?? []]
      );
    }

    const campaigns = await getSaleseekerCampaigns();
    const saved = campaigns.find((item) => item.id === campaign.id) ?? { ...campaign, leads: [] };
    return new Response(JSON.stringify(saved), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save campaign.';
    return jsonError(message, 500);
  }
}
