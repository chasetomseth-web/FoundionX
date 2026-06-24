import { NextResponse } from 'next/server';
import { getBrevoApiKey } from '@/lib/integration-settings';

const BREVO_API = 'https://api.brevo.com/v3';

export async function GET() {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse?.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    const res = await fetch(`${BREVO_API}/account`, {
      headers: { 'api-key': apiKey, Accept: 'application/json' },
    });
    if (!res?.ok) {
      const err = await res?.text();
      return NextResponse?.json({ error: `Brevo ${res?.status}: ${err}` }, { status: 400 });
    }
    const data = await res?.json();
    return NextResponse?.json({
      email: data?.email,
      firstName: data?.firstName,
      lastName: data?.lastName,
      companyName: data?.companyName,
      plan: data?.plan?.[0] ?? {},
    });
  } catch (error) {
    return NextResponse?.json({ error: error instanceof Error ? error?.message : 'Failed' }, { status: 500 });
  }
}
