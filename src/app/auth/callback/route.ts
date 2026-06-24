import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { authLog } from '@/lib/logger';
import { trackError } from '@/lib/error-tracker';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4028';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/orders-dashboard';
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth provider-level errors (e.g. user denied consent, 403 from Google)
  if (errorParam) {
    authLog.error('OAuth provider returned error', {
      error: { message: errorDescription ?? errorParam, code: errorParam },
      route: '/auth/callback',
    });
    trackError({
      error: new Error(errorDescription ?? errorParam),
      category: 'auth_failure',
      severity: 'medium',
      route: '/auth/callback',
      service: 'auth',
      metadata: { provider: 'google', oauthError: errorParam, oauthErrorDescription: errorDescription },
    });
    const loginUrl = new URL('/sign-up-login-screen', SITE_URL);
    loginUrl.searchParams.set('auth_error', errorParam);
    return NextResponse.redirect(loginUrl.toString());
  }

  if (!code) {
    authLog.warn('Auth callback called without code or error param', { route: '/auth/callback' });
    return NextResponse.redirect(`${SITE_URL}/sign-up-login-screen`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      authLog.error('Failed to exchange OAuth code for session', {
        error: { message: error.message, code: error.status?.toString() },
        route: '/auth/callback',
      });
      trackError({
        error,
        category: 'auth_failure',
        severity: 'high',
        route: '/auth/callback',
        service: 'auth',
        metadata: { provider: 'google', step: 'exchangeCodeForSession' },
      });
      const loginUrl = new URL('/sign-up-login-screen', SITE_URL);
      loginUrl.searchParams.set('auth_error', 'session_exchange_failed');
      return NextResponse.redirect(loginUrl.toString());
    }

    authLog.info('OAuth session exchange successful', {
      userId: data.user?.id,
      route: '/auth/callback',
    });

    // Validate next param to prevent open redirect
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/orders-dashboard';
    return NextResponse.redirect(`${SITE_URL}${safeNext}`);
  } catch (err) {
    authLog.error('Unexpected error in auth callback', {
      error: { message: err instanceof Error ? err.message : String(err) },
      route: '/auth/callback',
    });
    trackError({
      error: err,
      category: 'auth_failure',
      severity: 'critical',
      route: '/auth/callback',
      service: 'auth',
      metadata: { step: 'callback_handler' },
    });
    return NextResponse.redirect(`${SITE_URL}/sign-up-login-screen`);
  }
}
