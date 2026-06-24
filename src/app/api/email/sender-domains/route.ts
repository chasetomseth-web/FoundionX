import { NextResponse } from 'next/server';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

export async function GET() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    return NextResponse.json({ domains: [], error: 'Brevo not connected' }, { status: 200 });
  }

  try {
    const res = await fetch(`${BREVO_API_BASE}/senders`, {
      headers: { 'api-key': apiKey, Accept: 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ domains: [], senders: [] });
    }

    const data = await res.json();
    return NextResponse.json({ senders: data.senders ?? [] });
  } catch {
    return NextResponse.json({ senders: [], error: 'Failed to fetch senders' });
  }
}

// POST /api/email/sender-domains — add a sender domain
export async function POST(req: Request) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    return NextResponse.json({ error: 'Brevo not connected' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, email } = body as { name: string; email: string };

    const res = await fetch(`${BREVO_API_BASE}/senders`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message ?? 'Failed to add sender' }, { status: 400 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
