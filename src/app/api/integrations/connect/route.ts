'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getStripeSecretKey, getGoAffProAccessToken, getGoAffProPublicToken, getBrevoApiKey } from '@/lib/integration-settings';

// POST /api/integrations/connect
// Body: { provider: 'stripe' | 'goaffpro' | 'brevo', apiKey: string, secretKey?: string, publicToken?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey, secretKey, publicToken } = body as {
      provider: string;
      apiKey: string;
      secretKey?: string;
      publicToken?: string;
    };

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'provider and apiKey are required' }, { status: 400 });
    }

    let result: { connected: boolean; details: string; error?: string } = {
      connected: false,
      details: '',
    };

    if (provider === 'stripe') {
      const stripeKey = secretKey || apiKey;
      const res = await fetch('https://api.stripe.com/v1/account', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        result = {
          connected: true,
          details: `Account: ${data.id} · ${data.business_profile?.name ?? data.email ?? 'Stripe Account'}`,
        };
      } else {
        const err = await res.json();
        result = { connected: false, details: '', error: err.error?.message ?? 'Invalid Stripe key' };
      }
    } else if (provider === 'goaffpro') {
      const token = apiKey === 'env' ? (await getGoAffProAccessToken() ?? '') : apiKey;
      const res = await fetch('https://api.goaffpro.com/v1/admin/affiliates?limit=1', {
        headers: {
          'X-GOAFFPRO-ACCESS-TOKEN': token,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const total = data.total ?? (Array.isArray(data.affiliates) ? data.affiliates.length : 0);
        result = {
          connected: true,
          details: `GoAffPro connected · ${total} affiliates in program`,
        };
      } else {
        const errText = await res.text();
        result = {
          connected: false,
          details: '',
          error: `Invalid GoAffPro access token (${res.status}: ${errText.slice(0, 100)})`,
        };
      }
    } else if (provider === 'brevo') {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': apiKey, Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        result = {
          connected: true,
          details: `Account: ${data.email} · Plan: ${data.plan?.[0]?.type ?? 'Brevo'}`,
        };
      } else {
        result = { connected: false, details: '', error: 'Invalid Brevo API key' };
      }
    } else {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[INTEGRATIONS] connect error:', error);
    return NextResponse.json({ error: 'Connection test failed', connected: false }, { status: 500 });
  }
}

// GET /api/integrations/connect — return current connection status from env + DB
export async function GET() {
  const stripeKey = await getStripeSecretKey();
  const goaffproToken = await getGoAffProAccessToken();
  const goaffproPublicToken = await getGoAffProPublicToken();
  const brevoKey = await getBrevoApiKey();

  return NextResponse.json({
    stripe: {
      connected: !!stripeKey,
      hasPublishableKey: !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.length ?? 0 > 10),
    },
    goaffpro: {
      connected: !!goaffproToken,
      hasPublicToken: !!goaffproPublicToken,
      details: goaffproToken ? 'Access token configured' : undefined,
    },
    brevo: {
      connected: !!brevoKey,
    },
  });
}
