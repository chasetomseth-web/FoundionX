import { NextRequest, NextResponse } from 'next/server';
import { getBrevoApiKey } from '@/lib/integration-settings';

const BREVO_API = 'https://api.brevo.com/v3';

export async function POST(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    const { templateId, email } = await req.json();
    if (!templateId || !email) return NextResponse.json({ error: 'templateId and email required' }, { status: 400 });

    const res = await fetch(`${BREVO_API}/smtp/templates/${templateId}/sendTest`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ emailTo: [email] }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Brevo ${res.status}: ${err}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to send test' }, { status: 500 });
  }
}
