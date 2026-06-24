import { NextResponse } from 'next/server';
import { getBrevoApiKey } from '@/lib/integration-settings';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

export async function GET() {
  try {
    const apiKey = await getBrevoApiKey();
    if (!apiKey) {
      return NextResponse.json({ lists: [] });
    }

    const res = await fetch(`${BREVO_API_BASE}/contacts/lists?limit=50&offset=0`, {
      headers: {
        'api-key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ lists: [] });
    }

    const data = await res.json();
    return NextResponse.json({ lists: data.lists ?? [] });
  } catch {
    return NextResponse.json({ lists: [] });
  }
}
