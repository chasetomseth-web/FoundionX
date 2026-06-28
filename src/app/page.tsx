'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, Zap, BarChart3, Link2 } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4028';

const features = [
  { key: 'feat-orders', icon: CheckCircle2, text: 'Orders, fulfillment & shipping in one place' },
  { key: 'feat-stripe', icon: Zap, text: 'Stripe-powered payments with reconciliation' },
  { key: 'feat-analytics', icon: BarChart3, text: 'Real-time revenue analytics & reporting' },
  { key: 'feat-affiliate', icon: Link2, text: 'Built-in affiliate & commission management' },
];

const stats = [
  { key: 'stat-gmv', value: '$2.4M+', label: 'GMV processed' },
  { key: 'stat-orders', value: '18,400+', label: 'Orders managed' },
  { key: 'stat-affiliates', value: '1,200+', label: 'Active affiliates' },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2822-1.71V4.9582H.9574C.3477 6.1731 0 7.5477 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  );
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-danger' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-warning' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-primary' };
  return { score, label: 'Strong', color: 'bg-success' };
}

// ─── Auth Error Banner ───────────────────────────────────────

function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const authError = searchParams.get('auth_error');
  if (!authError) return null;

  const messages: Record<string, string> = {
    session_exchange_failed: 'Google sign-in failed. Please try again.',
    access_denied: 'Google sign-in was cancelled.',
    redirect_uri_mismatch: 'OAuth configuration error. Contact support.',
  };
  const msg = messages[authError] ?? 'Authentication failed. Please try again.';

  return (
    <div className="flex items-start gap-2.5 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

// ─── Sign In Form ────────────────────────────────────────────

function SignInForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      router.push('/orders-dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    if (!email.trim()) { setError('Enter your email address first'); return; }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${SITE_URL}/auth/callback`,
      });
      if (resetError) throw resetError;
      setResetSent(true);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (oauthError) throw oauthError;
      // Redirect handled by OAuth callback
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="fade-in flex flex-col items-center text-center py-8 gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-primary" />
        </div>
        <h3 className="text-xl font-700 text-foreground">Check your email</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          We've sent a password reset link to <strong className="text-foreground">{email}</strong>.
        </p>
        <button
          onClick={() => setResetSent(false)}
          className="mt-2 text-sm text-primary hover:underline font-500"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-700 text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your wiastro dashboard</p>
      </div>

      <AuthErrorBanner />

      {error && (
        <div className="flex items-start gap-2.5 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="w-full h-10 flex items-center justify-center gap-2.5 rounded-lg border border-input bg-background hover:bg-muted/50 text-sm font-500 text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-4"
      >
        {googleLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or sign in with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSignIn} className="flex flex-col gap-5">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-sm font-500 text-foreground">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@yourstore.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 px-3 rounded-lg border border-input text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-background"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-500 text-foreground">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-xs text-primary hover:underline font-500 disabled:opacity-60"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full px-3 pr-10 rounded-lg border border-input text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-background"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="h-10 w-full rounded-lg bg-foreground text-background text-sm font-600 flex items-center justify-center gap-2 hover:bg-foreground/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitchTab} className="text-primary hover:underline font-500">
          Create one
        </button>
      </p>
    </div>
  );
}

// ─── Sign Up Form ────────────────────────────────────────────

function SignUpForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const strength = getPasswordStrength(password);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback`,
        },
      });
      if (signUpError) throw signUpError;
      setSignupSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="fade-in flex flex-col items-center text-center py-8 gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-primary" />
        </div>
        <h3 className="text-xl font-700 text-foreground">Check your email</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
          Click the link to verify your account, then sign in.
        </p>
        <button
          onClick={onSwitchTab}
          className="mt-2 px-6 py-2.5 rounded-lg bg-foreground text-background text-sm font-600 hover:bg-foreground/90 active:scale-[0.98] transition-all"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-700 text-foreground">Create your account</h2>
        <p className="text-sm text-muted-foreground mt-1">Get started with wiastro in under a minute</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Sign Up */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={googleLoading || loading}
        className="w-full h-10 flex items-center justify-center gap-2.5 rounded-lg border border-input bg-background hover:bg-muted/50 text-sm font-500 text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-4"
      >
        {googleLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or sign up with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-email" className="text-sm font-500 text-foreground">
            Email address <span className="text-danger">*</span>
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@yourstore.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 px-3 rounded-lg border border-input text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-background"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-password" className="text-sm font-500 text-foreground">
            Password <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full px-3 pr-10 rounded-lg border border-input text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-background"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Strength indicator */}
          {password.length > 0 && (
            <div className="mt-1">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      level <= strength.score ? strength.color : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Strength: <span className="font-500">{strength.label}</span>
              </p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="text-sm font-500 text-foreground">
            Confirm password <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 w-full px-3 pr-10 rounded-lg border border-input text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-background"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-danger">Passwords do not match</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="h-10 w-full rounded-lg bg-foreground text-background text-sm font-600 flex items-center justify-center gap-2 hover:bg-foreground/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Creating account…
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchTab} className="text-primary hover:underline font-500">
          Sign in
        </button>
      </p>
    </div>
  );
}

// ─── Main Auth Page ──────────────────────────────────────────

function AuthPageInner() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-foreground flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary -translate-x-16 translate-y-16" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <AppLogo size={36} />
          <span className="text-xl font-700 text-white tracking-tight">wiastro</span>
        </div>

        {/* Hero copy */}
        <div className="relative flex-1 flex flex-col justify-center py-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-500 w-fit mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Platform status: All systems operational
          </span>
          <h1 className="text-4xl xl:text-5xl font-800 text-white leading-tight mb-4">
            Your entire store.<br />One dashboard.
          </h1>
          <p className="text-base text-white/60 leading-relaxed max-w-md mb-8">
            wiastro replaces Shopify, GoAffPro, and Brevo with a single, fast operating system built for modern e-commerce merchants.
          </p>

          {/* Features */}
          <div className="flex flex-col gap-3 mb-10">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={13} className="text-primary" />
                  </div>
                  <span className="text-sm text-white/70">{f.text}</span>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.key} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xl font-700 text-white tabular-nums">{s.value}</p>
                <p className="text-xs text-white/50 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-xs text-white/30">© 2026 wiastro. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel — forms */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <AppLogo size={32} />
            <span className="text-lg font-700 text-foreground">wiastro</span>
        </div>

        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 mb-8">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-600 transition-all duration-150 ${
                tab === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-600 transition-all duration-150 ${
                tab === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {tab === 'login' ? (
            <SignInForm onSwitchTab={() => setTab('signup')} />
          ) : (
            <SignUpForm onSwitchTab={() => setTab('login')} />
          )}
        </div>
      </div>
    </div>
  );
}
export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}
