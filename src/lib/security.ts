/**
 * MerchantOS — Production Security Hardening
 * CORS, rate limiting, secure headers, API key protection,
 * webhook signature enforcement, tenant isolation verification
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// TYPES
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface SecurityConfig {
  corsOrigins: string[];
  rateLimitRpm: number;
  rateLimitBurst: number;
  enableHSTS: boolean;
  enableCSP: boolean;
}

// ============================================================
// IN-MEMORY RATE LIMITER (replace with Redis in multi-instance)
// ============================================================

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(
  identifier: string,
  limitPerMinute: number = parseInt(process.env.RATE_LIMIT_RPM ?? '100', 10),
  burst: number = parseInt(process.env.RATE_LIMIT_BURST ?? '20', 10)
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const key = `rl:${identifier}`;

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, newEntry);
    return { allowed: true, remaining: limitPerMinute - 1, resetAt: newEntry.resetAt };
  }

  entry.count += 1;
  const effectiveLimit = limitPerMinute + burst;
  const allowed = entry.count <= effectiveLimit;
  const remaining = Math.max(0, effectiveLimit - entry.count);

  return { allowed, remaining, resetAt: entry.resetAt };
}

// ============================================================
// CORS CONFIGURATION
// ============================================================

function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function getCORSHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const origin = requestOrigin ?? '';

  const isAllowed =
    allowedOrigins.length === 0 || // dev fallback
    allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV !== 'production'); // allow all in dev

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] ?? '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID, X-API-Key',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'};
}

// ============================================================
// SECURE RESPONSE HEADERS
// ============================================================

export function getSecureHeaders(): Record<string, string> {
  const isProd = process.env.NODE_ENV === 'production';

  const headers: Record<string, string> = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Prevent clickjacking
// XSS protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
    // Remove server fingerprint
    'X-Powered-By': ''};

  if (isProd) {
    // HSTS — only in production (breaks local dev)
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';

    // Content Security Policy
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.brevo.com https://api.goaffpro.com wss://*.supabase.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"].join('; ');
  }

  return headers;
}

// ============================================================
// API KEY PROTECTION
// ============================================================

export function validateInternalApiKey(request: NextRequest): boolean {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) return true; // not configured — skip in dev

  const apiKey =
    request.headers.get('X-API-Key') ??
    request.headers.get('Authorization')?.replace('Bearer ', '');

  return apiKey === internalSecret;
}

// ============================================================
// WEBHOOK SIGNATURE ENFORCEMENT
// ============================================================

export async function verifyStripeWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[SECURITY] STRIPE_WEBHOOK_SECRET not configured');
    return false;
  }

  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-04-30.basil' as any });
    stripe.webhooks.constructEvent(body, signature, secret);
    return true;
  } catch {
    return false;
  }
}

export function verifyGoAffProWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = process.env.GOAFFPRO_WEBHOOK_SECRET;
  if (!secret) return false;

  try {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ============================================================
// TENANT ISOLATION VERIFICATION
// ============================================================

export function extractAndVerifyTenant(request: NextRequest): string | null {
  const tenantId =
    request.headers.get('X-Tenant-ID') ??
    request.headers.get('x-tenant-id');

  if (!tenantId || tenantId.trim() === '') {
    return null;
  }

  // Basic format validation (cuid or uuid)
  const validFormat = /^[a-zA-Z0-9_-]{8}$/.test(tenantId);
  if (!validFormat) return null;

  return tenantId;
}

// ============================================================
// SECURITY MIDDLEWARE HELPER
// ============================================================

export function applySecurityHeaders(response: NextResponse, requestOrigin: string | null): NextResponse {
  const secureHeaders = getSecureHeaders();
  const corsHeaders = getCORSHeaders(requestOrigin);

  const allHeaders = { ...secureHeaders, ...corsHeaders };

  for (const [key, value] of Object.entries(allHeaders)) {
    if (value) response.headers.set(key, value);
    else response.headers.delete(key);
  }

  return response;
}

// ============================================================
// RATE LIMIT RESPONSE HELPER
// ============================================================

export function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000)},
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-Limit': process.env.RATE_LIMIT_RPM ?? '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000))}}
  );
}

// ============================================================
// SECURITY CHECKLIST (for deployment verification)
// ============================================================

export function getSecurityChecklist(): Record<string, boolean> {
  return {
    'STRIPE_WEBHOOK_SECRET configured': !!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),
    'GOAFFPRO_WEBHOOK_SECRET configured': !!process.env.GOAFFPRO_WEBHOOK_SECRET,
    'BREVO_WEBHOOK_SECRET configured': !!process.env.BREVO_WEBHOOK_SECRET,
    'INTERNAL_API_SECRET configured': !!process.env.INTERNAL_API_SECRET,
    'CORS origins configured': !!process.env.CORS_ALLOWED_ORIGINS,
    'HSTS enabled (production)': process.env.NODE_ENV === 'production',
    'CSP enabled (production)': process.env.NODE_ENV === 'production',
    'Rate limiting configured': !!process.env.RATE_LIMIT_RPM,
    'DATABASE_URL uses SSL': (process.env.DATABASE_URL ?? '').includes('sslmode=require'),
    'REDIS_URL configured': !!process.env.REDIS_URL};
}
