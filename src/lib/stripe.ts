import Stripe from 'stripe';
import { prisma } from './prisma';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'default-key-change-in-production-min-32-chars!!';
const ALGORITHM = 'aes-256-cbc';

export function encryptCredential(text: string): string {
  if (!text) return '';
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptCredential(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText;
  }
}

export async function getStripeClient(storeId?: string): Promise<Stripe | null> {
  let secretKey: string | null = null;

  // 1. Try integration_settings table (Supabase - where UI saves)
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('integration_settings')
      .select('credentials')
      .eq('provider', 'stripe')
      .maybeSingle();
    const creds = data?.credentials as Record<string, string> | null;
    if (creds?.secretKey && creds.secretKey.length > 10 && !creds.secretKey.startsWith('pk_')) {
      secretKey = creds.secretKey;
    }
  } catch (error) {
    console.error('[STRIPE] Failed to load from integration_settings:', error);
  }

  // 2. Try store_credentials table (Prisma, encrypted)
  if (!secretKey && storeId) {
    try {
      const credentials = await prisma.store_credentials.findUnique({
        where: { store_id: storeId },
        select: { stripe_secret_key: true },
      });
      if (credentials?.stripe_secret_key) {
        secretKey = decryptCredential(credentials.stripe_secret_key);
      }
    } catch (error) {
      console.error('[STRIPE] Failed to load from store_credentials:', error);
    }
  }

  // 3. Fall back to environment variable (last resort)
  if (!secretKey) {
    secretKey = process.env.STRIPE_SECRET_KEY || null;
  }

  if (!secretKey) {
    console.error('[STRIPE] No secret key found');
    return null;
  }

  if (secretKey.startsWith('pk_')) {
    console.error('[STRIPE] ERROR: Publishable key provided where secret key is required');
    return null;
  }

  return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
}

export async function getStripeSecretKey(storeId?: string): Promise<string | null> {
  let secretKey: string | null = null;

  // 1. Try integration_settings table (Supabase - where UI saves)
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('integration_settings')
      .select('credentials')
      .eq('provider', 'stripe')
      .maybeSingle();
    const creds = data?.credentials as Record<string, string> | null;
    if (creds?.secretKey && !creds.secretKey.startsWith('pk_')) {
      secretKey = creds.secretKey;
    }
  } catch {}

  // 2. Try store_credentials table (Prisma, encrypted)
  if (!secretKey && storeId) {
    try {
      const credentials = await prisma.store_credentials.findUnique({
        where: { store_id: storeId },
        select: { stripe_secret_key: true },
      });
      if (credentials?.stripe_secret_key) {
        secretKey = decryptCredential(credentials.stripe_secret_key);
      }
    } catch {}
  }

  // 3. Fall back to environment variable (last resort)
  if (!secretKey) {
    secretKey = process.env.STRIPE_SECRET_KEY || null;
  }

  return secretKey;
}

export function maskCredential(credential: string | null | undefined): string {
  if (!credential) return '';
  if (credential.length <= 8) return '****';
  const prefix = credential.substring(0, 7);
  const suffix = credential.substring(credential.length - 4);
  return `${prefix}...${suffix}`;
}
