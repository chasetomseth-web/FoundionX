import { NextRequest } from 'next/server';
import { jsonError, queryOne, requireSaleseekerAuth, toSaleseekerLead } from '../../../lib/saleseeker';

interface TagPayload {
  tags?: string[];
}

function parseTagPayload(body: unknown): TagPayload | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as TagPayload;
  if (!Array.isArray(value.tags)) return null;
  return { tags: value.tags.map((tag) => String(tag).trim()).filter(Boolean) };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireSaleseekerAuth(req);
  if (authError) return authError;

  const payload = parseTagPayload(await req.json().catch(() => null));
  const tags = payload?.tags ?? [];
  if (!payload || tags.length === 0) return jsonError('At least one tag is required.', 400);

  try {
    const row = await queryOne<{
      id: string;
      business_id: string;
      business_name: string;
      website: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      emails: string[];
      owner_name: string | null;
      source_url: string | null;
      tags: string[];
      created_at: string;
    }>(
      `UPDATE saleseeker_leads AS l
       SET tags = ARRAY(
         SELECT DISTINCT tag
         FROM unnest(COALESCE(l.tags, ARRAY[]::TEXT[]) || $2::TEXT[]) AS tag
       )
       FROM saleseeker_leads
       JOIN saleseeker_businesses b ON b.id = l.business_id
       WHERE l.id = $1 AND b.id = l.business_id
       RETURNING
         l.id,
         l.business_id,
         b.name AS business_name,
         b.website,
         b.phone,
         b.address,
         b.city,
         b.state,
         ARRAY(SELECT DISTINCT l2.email FROM saleseeker_leads l2 WHERE l2.business_id = l.business_id ORDER BY l2.email) AS emails,
         l.owner_name,
         l.source_url,
         l.tags,
         l.created_at::text`,
      [params.id, tags]
    );

    if (!row) return jsonError('Lead not found.', 404);
    return new Response(JSON.stringify(toSaleseekerLead(row)), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update lead tags.';
    return jsonError(message, 500);
  }
}