/**
 * Server-side helper to read integration credentials.
 * Priority: env vars → Supabase integration_settings table
 */
import { createClient } from '@/lib/supabase/server';

export interface IntegrationCredentials {
  stripe?: {
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
  };
  goaffpro?: {
    accessToken?: string;
    publicToken?: string;
  };
  brevo?: {
    apiKey?: string;
  };
}

const isReal = (v?: string) =>
  !!v && v.length > 10 && !v.startsWith('your-') && !v.includes('placeholder');

/** Load credentials from Supabase for a given provider */
async function loadFromDB(provider: string): Promise<Record<string, string>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('integration_settings')
      .select('credentials')
      .eq('provider', provider)
      .maybeSingle();
    return (data?.credentials as Record<string, string>) ?? {};
  } catch {
    return {};
  }
}

/** Get Stripe secret key — DB first, then env */
export async function getStripeSecretKey(): Promise<string | null> {
  const creds = await loadFromDB('stripe');
  if (isReal(creds.secretKey)) return creds.secretKey!;
  const envKey = process.env.STRIPE_SECRET_KEY;
  return isReal(envKey) ? envKey! : null;
}

/** Get GoAffPro access token — DB first, then env */
export async function getGoAffProAccessToken(): Promise<string | null> {
  const creds = await loadFromDB('goaffpro');
  if (isReal(creds.accessToken)) return creds.accessToken!;
  const envToken = process.env.GOAFFPRO_ACCESS_TOKEN;
  return isReal(envToken) ? envToken! : null;
}

/** Get GoAffPro public token — DB first, then env */
export async function getGoAffProPublicToken(): Promise<string | null> {
  const creds = await loadFromDB('goaffpro');
  if (isReal(creds.publicToken)) return creds.publicToken!;
  const envToken = process.env.GOAFFPRO_PUBLIC_TOKEN;
  return isReal(envToken) ? envToken! : null;
}

/** Get Brevo API key — DB first, then env */
export async function getBrevoApiKey(): Promise<string | null> {
  const creds = await loadFromDB('brevo');
  if (isReal(creds.apiKey)) return creds.apiKey!;
  const envKey = process.env.BREVO_API_KEY;
  return isReal(envKey) ? envKey! : null;
}
