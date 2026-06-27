import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { systemLog } from '@/lib/logger';
import { appendAuditLog } from '@/lib/audit-log';

export const runtime = 'nodejs';
const COOKIE_NAME = 'mos_affiliate';
const DEFAULT_COOKIE_DAYS = 30;

// ── Rate Limiting ────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in ms
const RATE_LIMIT_MAX_CLICKS = 5;
const clickTracker = new Map<string, number[]>(); // Map<ip_code, timestamps[]>

function isRateLimited(ip: string, code: string): boolean {
  const key = `${ip}_${code}`;
  const now = Date.now();
  const timestamps = clickTracker.get(key) ?? [];
  
  // Remove timestamps older than 24 hours
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX_CLICKS) {
    return true;
  }
  
  // Add current timestamp and update map
  recentTimestamps.push(now);
  clickTracker.set(key, recentTimestamps);
  
  // Cleanup: Remove old entries to prevent memory growth
  if (clickTracker.size > 10000) {
    for (const [k, ts] of clickTracker.entries()) {
      if (ts.every(t => now - t > RATE_LIMIT_WINDOW)) {
        clickTracker.delete(k);
      }
    }
  }
  
  return false;
}

/**
 * GET /api/affiliates/track?code=CODE&storeId=STOREID&redirect=URL
 *
 * Records an affiliate click, sets a tracking cookie, then redirects the visitor.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code')?.trim();
  const storeId = searchParams.get('storeId')?.trim();
  const redirect = searchParams.get('redirect') ?? '/';

  if (!code || !storeId) {
    return NextResponse.json({ error: 'code and storeId are required' }, { status: 400 });
  }

  const affiliate = await prisma.affiliate.findFirst({
    where: { referralCode: code, storeId, status: 'active' },
  });

  if (!affiliate) {
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  
  // Check rate limit
  if (isRateLimited(ip, code)) {
    // Log suspected fraud
    systemLog.warn('Affiliate click rate limit exceeded', {
      ip,
      code,
      affiliateId: affiliate.id,
      userAgent: req.headers.get('user-agent'),
    });
    
    appendAuditLog({
      actorId: 'system',
      tenantId: storeId,
      action: 'affiliate.commission.rejected',
      resourceType: 'affiliate_click',
      resourceId: affiliate.id,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
      metadata: { reason: 'rate_limit_exceeded', code, limit: RATE_LIMIT_MAX_CLICKS },
    });
    
    // Still redirect but don't record click
    const safeRedirect = redirect.startsWith('/') || redirect.startsWith('http') ? redirect : '/';
    return NextResponse.redirect(new URL(safeRedirect, req.url));
  }

  // Record click
  await prisma.affiliateClick.create({
    data: {
      affiliateId: affiliate.id,
      ip: ip !== 'unknown' ? ip : undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    },
  });

  await prisma.affiliateLink.updateMany({
    where: { affiliateId: affiliate.id, isActive: true },
    data: { clicks: { increment: 1 } },
  });

  // NOTE: Current schema only has commissionRate; no holdDays/cookieDays fields exist.
  // Keep a safe default until schema adds these fields.
  const cookieDays = DEFAULT_COOKIE_DAYS;

  const safeRedirect = redirect.startsWith('/') || redirect.startsWith('http') ? redirect : '/';
  const response = NextResponse.redirect(new URL(safeRedirect, req.url));

  response.cookies.set(
    COOKIE_NAME,
    JSON.stringify({
      affiliateId: affiliate.id,
      referralCode: code,
      storeId,
      ts: Date.now(),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieDays * 24 * 60 * 60,
      path: '/',
    }
  );

  return response;
}

