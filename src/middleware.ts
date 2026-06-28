import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/sign-up-login-screen',
  '/auth/callback',
  '/api/auth',
  '/api/webhooks',
  '/api/storefront/render',
  '/api/health',
  '/portal/login',
  '/portal/create-account',
  '/render',
];

// Protected route patterns for customer portal
const CUSTOMER_PROTECTED_ROUTES = ['/portal/dashboard', '/portal/orders', '/portal/subscriptions', '/portal/billing', '/portal/account', '/portal/affiliate'];

const AFFILIATE_COOKIE_NAME = 'mos_affiliate';
const AFFILIATE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const response = NextResponse.next();

  // ── Affiliate Link Tracking ──────────────────────────────────────────────
  // If URL contains ?ref=CODE, set the affiliate tracking cookie
  const refCode = searchParams.get('ref');
  if (refCode && refCode.trim()) {
    const cookieValue = JSON.stringify({
      referralCode: refCode.trim().toUpperCase(),
      storeId: searchParams.get('store') ?? 'default',
    });
    response.cookies.set(AFFILIATE_COOKIE_NAME, cookieValue, {
      httpOnly: false, // readable by client-side JS for checkout
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: AFFILIATE_COOKIE_MAX_AGE,
    });
  }

  // ── Custom Domain Rewrite ───────────────────────────────────────────────
  const hostname = (req.headers.get("host") || "").split(":")[0];
  const isDashboardDomain =
    hostname === "localhost" ||
    hostname.includes("vercel.app") ||
    hostname === "merchant-os-seven.vercel.app" ||
    hostname === "wiastro.com" ||
    hostname === "www.wiastro.com";

  if (!isDashboardDomain && !pathname.startsWith("/render/") && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/render/${encodeURIComponent(hostname)}/`;
    return NextResponse.rewrite(url);
  }

  // ── Public Routes ────────────────────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) || pathname === '/';
  if (isPublicRoute) {
    return response;
  }

  // ── Customer Portal Protection ──────────────────────────────────────────
  const isCustomerRoute = CUSTOMER_PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (isCustomerRoute) {
    const customerSession = req.cookies.get('customer_session')?.value;
    if (!customerSession) {
      // API routes return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/portal/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // ── Protect All App Routes (require authentication) ─────────────────────
  // Skip redirect for Next.js RSC prefetch requests to avoid "Failed to fetch RSC payload" errors
  const isRscRequest = req.headers.get('RSC') === '1' || req.headers.get('Next-Router-Prefetch') === '1';
  if (isRscRequest) {
    return response;
  }

  // Check for Supabase session cookies (sb-* prefix) or legacy session token
  const hasSbCookie = [...req.cookies.getAll()].some(
    (c) => c.name.startsWith('sb-') && c.value
  );
  const sessionToken =
    hasSbCookie ||
    req.cookies.get('merchantos_session')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (!sessionToken) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/sign-up-login-screen', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|public).*)',
  ],
};
