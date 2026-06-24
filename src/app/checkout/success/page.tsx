'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Package, Mail } from 'lucide-react';
import Link from 'next/link';

interface SessionData {
  status: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const router = useRouter();

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided.');
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/checkout/success?session_id=${sessionId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load order details');
        setData(json);

        // Check if user came from a funnel — redirect to upsell if so
        const funnelSlug = getCookie('funnel_slug');
        if (funnelSlug && json.metadata?.funnel_slug) {
          // Look up the funnel to find the first upsell step
          try {
            const funnelRes = await fetch(`/api/funnels/resolve?slug=${funnelSlug}&after_payment=true`);
            const funnelData = await funnelRes.json();
            if (funnelData?.redirect_url) {
              router.replace(funnelData.redirect_url);
              return;
            }
          } catch {
            // If funnel lookup fails, just show the success page
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, router]);

  // Redirecting to upsell — show loading
  if (loading && data?.metadata?.funnel_slug) {
    // Don't show loading here; let the redirect handle it
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your order…</p>
        </div>
      </div>
    );
  }

  if (error || data?.status !== 'paid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-card border border-border rounded-2xl p-8">
            <p className="text-lg font-700 text-foreground mb-2">{error ? 'Something went wrong' : 'Payment Pending'}</p>
            <p className="text-sm text-muted-foreground mb-6">{error ?? 'Your payment is still processing. Check your email for confirmation.'}</p>
            <Link
              href="/"
              className="inline-flex h-10 px-6 rounded-xl bg-primary text-primary-foreground
                         text-sm font-600 items-center justify-center hover:bg-primary/90 transition-all"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const orderNumber = data?.metadata?.orderId?.slice(-8).toUpperCase() ?? '—';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-700 text-foreground">Order Confirmed!</h1>
          <p className="text-sm text-muted-foreground mt-1">Thank you for your purchase</p>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Reference</span>
                <span className="font-700 text-foreground font-mono">#{orderNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-700 text-foreground">{data.currency?.toUpperCase()} ${data.amount.toFixed(2)}</span>
              </div>
              {data.customerEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confirmation sent to</span>
                  <span className="font-500 text-foreground">{data.customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground mb-3">What happens next</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail size={13} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-600 text-foreground">Confirmation email</p>
                  <p className="text-xs text-muted-foreground">Check your inbox for your receipt and order details</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Package size={13} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-600 text-foreground">Order processing</p>
                  <p className="text-xs text-muted-foreground">Your order is being prepared. You'll receive tracking info when it ships.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

