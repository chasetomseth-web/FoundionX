import { NextRequest } from 'next/server';
import { executeRaw, jsonError, queryMany, requireSaleseekerAuth } from '../lib/saleseeker';
import type { SaleseekerLead } from '@/app/tools/saleseeker/types';

interface IngestPayload {
  business_id?: string;
  emails?: string[];
  phones?: string[];
  owner_name?: string;
  source_url?: string;
}

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function parseIngestPayload(body: unknown): IngestPayload | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as IngestPayload;
  if (typeof value.business_id !== 'string' || !value.business_id) return null;
  return {
    business_id: value.business_id,
    emails: Array.isArray(value.emails) ? value.emails : [],
    phones: Array.isArray(value.phones) ? value.phones : [],
    owner_name: typeof value.owner_name === 'string' ? value.owner_name : '',
    source_url: typeof value.source_url === 'string' ? value.source_url : '',
  };
}

function extractEmails(payload: IngestPayload) {
  const fromFields = [...(payload.emails ?? []), ...(payload.phones ?? []), payload.owner_name ?? '', payload.source_url ?? ''].join(' ');
  const emails = new Set<string>();
  fromFields.match(emailRegex)?.forEach((email) => emails.add(email.toLowerCase()));
  return [...emails];
}

export async function POST(req: NextRequest) {
  const authError = await requireSaleseekerAuth(req);
  if (authError) return authError;

  const payload = parseIngestPayload(await req.json().catch(() => null));
  if (!payload) return jsonError('Invalid ingestion payload.', 400);

  const emails = extractEmails(payload);
  if (emails.length === 0) {
    return jsonError('No email found. Business is not a valid Saleseeker lead.', 400);
  }

  const phone = payload.phones?.[0] ?? null;
  const ownerName = payload.owner_name?.trim() || null;
  const sourceUrl = payload.source_url?.trim() || null;

  try {
    const inserted: SaleseekerLead[] = [];
    for (const email of emails) {
      const [row] = await queryMany<SaleseekerLead>(
        `INSERT INTO saleseeker_leads (id, business_id, email, phone, owner_name, source_url, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now())
         ON CONFLICT (business_id, email) DO UPDATE SET
           phone = COALESCE(EXCLUDED.phone, saleseeker_leads.phone),
           owner_name = COALESCE(EXCLUDED.owner_name, saleseeker_leads.owner_name),
           source_url = COALESCE(EXCLUDED.source_url, saleseeker_leads.source_url)
         RETURNING id, business_id, email, phone, owner_name, source_url, created_at::text`,
        [payload.business_id, email, phone, ownerName, sourceUrl]
      );
      inserted.push(row);
    }

    await executeRaw(
      `UPDATE saleseeker_jobs
       SET status = 'done'
       WHERE id = (SELECT id FROM saleseeker_jobs WHERE status = 'running' ORDER BY created_at DESC LIMIT 1)`
    );

    return new Response(JSON.stringify({ ok: true, leads: inserted }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to ingest enrichment results.';
    return jsonError(message, 500);
  }
}
