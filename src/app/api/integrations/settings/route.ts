import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const providerFilter = searchParams.get('provider');

    // Query integration_settings from Supabase
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('integration_settings')
      .select('provider, credentials, connected, details');

    if (error) {
      console.error('[INTEGRATIONS SETTINGS] GET error:', error);
    }

    const settings: Record<string, { credentials: Record<string, string>; connected: boolean; envConnected?: boolean; details?: string }> = {};

    for (const row of data ?? []) {
      const envConnected = row.provider === 'stripe'
        ? !!process.env.STRIPE_SECRET_KEY
        : row.provider === 'goaffpro'
          ? !!process.env.GOAFFPRO_ACCESS_TOKEN
          : false;
      settings[row.provider] = {
        credentials: row.credentials ?? {},
        connected: (row.connected ?? false) || envConnected,
        envConnected,
        details: row.details ?? undefined,
      };
    }

    // Also check store_credentials for Stripe keys
    // This is the Prisma-backed table that stores per-store encrypted credentials
    try {
      const storeCreds = await prisma.store_credentials.findFirst({
        where: { stripe_secret_key: { not: null } },
        select: { stripe_secret_key: true, stripe_publishable_key: true },
      });
      if (storeCreds?.stripe_secret_key) {
        // Add/override stripe setting if keys exist
        settings['stripe'] = {
          ...(settings['stripe'] ?? {}),
          credentials: {
            ...(settings['stripe']?.credentials ?? {}),
            has_stripe_secret: 'true',
            has_stripe_publishable: storeCreds.stripe_publishable_key ? 'true' : 'false',
          },
          connected: true,
          envConnected: !!process.env.STRIPE_SECRET_KEY,
        };
      }
    } catch (dbErr) {
      // store_credentials table might not exist yet; ignore
      console.warn('[INTEGRATIONS] Could not query store_credentials:', dbErr);
    }

    // Filter by provider if requested
    if (providerFilter) {
      const filtered = settings[providerFilter] ?? null;
      return NextResponse.json({ settings: { [providerFilter]: filtered } });
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[INTEGRATIONS SETTINGS] GET exception:', err);
    return NextResponse.json({ settings: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, credentials, connected, details } = body as {
      provider: string;
      credentials: Record<string, string>;
      connected: boolean;
      details?: string;
    };
    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 });
    }
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('integration_settings')
      .upsert(
        {
          provider,
          credentials: credentials ?? {},
          connected: connected ?? false,
          details: details ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider' }
      );
    if (error) {
      console.error('[INTEGRATIONS SETTINGS] POST error:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[INTEGRATIONS SETTINGS] POST exception:', err);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}