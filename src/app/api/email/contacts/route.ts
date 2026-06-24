import { NextRequest, NextResponse } from 'next/server';
import { getBrevoApiKey } from '@/lib/integration-settings';

const BREVO_API = 'https://api.brevo.com/v3';

async function brevo<T>(path: string, apiKey: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BREVO_API}${path}`, {
    ...options,
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo ${res.status}: ${err}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// GET /api/email/contacts — list contacts from Brevo
export async function GET(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const listId = searchParams.get('listId');

  try {
    let path = `/contacts?limit=${limit}&offset=${offset}&sort=desc`;
    if (listId) path += `&listIds[]=${listId}`;

    const data = await brevo<{ contacts: BrevoContact[]; count: number }>(path, apiKey);
    return NextResponse.json({ contacts: data.contacts ?? [], count: data.count ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST /api/email/contacts — create or update a contact in Brevo
export async function POST(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    const body = await req.json();
    const { email, firstName, lastName, tags, listIds } = body;
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    await brevo('/contacts', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: firstName ?? '', LASTNAME: lastName ?? '' },
        listIds: listIds ?? [],
        updateEnabled: true,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create contact' }, { status: 500 });
  }
}

// PATCH /api/email/contacts — update contact attributes/tags
export async function PATCH(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    const { email, attributes, listIds, unlinkListIds } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const body: Record<string, unknown> = {};
    if (attributes) body.attributes = attributes;
    if (listIds) body.listIds = listIds;
    if (unlinkListIds) body.unlinkListIds = unlinkListIds;

    await brevo(`/contacts/${encodeURIComponent(email)}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE /api/email/contacts — unsubscribe a contact
export async function DELETE(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    await brevo(`/contacts/${encodeURIComponent(email)}`, apiKey, { method: 'DELETE' });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete contact' }, { status: 500 });
  }
}

interface BrevoContact {
  id: number;
  email: string;
  emailBlacklisted: boolean;
  smsBlacklisted: boolean;
  createdAt: string;
  modifiedAt: string;
  listIds: number[];
  attributes: Record<string, unknown>;
}
