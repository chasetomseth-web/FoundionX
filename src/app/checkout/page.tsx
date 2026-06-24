'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import DefaultTemplate from './templates/DefaultTemplate';
import MinimalTemplate from './templates/MinimalTemplate';
import BrandedTemplate from './templates/BrandedTemplate';
import TwoColumnTemplate from './templates/TwoColumnTemplate';
import FunnelTemplate from './templates/FunnelTemplate';
import type { CheckoutTemplate, CheckoutItem } from './templates/types';


function CheckoutContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CheckoutItem[]>([]);

  const storeId = searchParams.get('storeId') ?? '';
  const affiliateCode = searchParams.get('ref') ?? searchParams.get('affiliate') ?? '';
  const couponCode = searchParams.get('coupon') ?? '';
  const offerId = searchParams.get('offerId') ?? '';
  const productId = searchParams.get('productId') ?? '';
  const templateParam = (searchParams.get('template') ?? 'default') as CheckoutTemplate;

  useEffect(() => {
    const built: CheckoutItem[] = [];

    if (offerId) {
      built.push({ name: 'Product', price: 0, quantity: 1, offerId });
    } else if (productId) {
      built.push({ name: 'Product', price: 0, quantity: 1, productId });
    }

    try {
      const cartRaw = sessionStorage.getItem('mos_cart');
      if (cartRaw) {
        const cart = JSON.parse(cartRaw) as CheckoutItem[];
        if (Array.isArray(cart) && cart.length > 0) {
          built.push(...cart);
        }
      }
    } catch {
      // ignore
    }

    setItems(built.length > 0 ? built : []);
  }, [offerId, productId]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    if (!storeId) {
      setError('Store not found.');
      return;
    }
    if (items.length === 0) {
      setError('No items to purchase.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const origin = window.location.origin;
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          items,
          affiliateCode: affiliateCode || undefined,
          couponCode: couponCode || undefined,
          template: templateParam || undefined,
          mode: 'payment',
          successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/checkout?storeId=${storeId}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to start checkout.');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No checkout URL returned. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const templateProps = {
    items,
    subtotal,
    loading,
    error,
    onCheckout: handleCheckout,
    couponCode,
    affiliateCode,
    storeId,
  };

  switch (templateParam) {
    case 'minimal':
      return <MinimalTemplate {...templateProps} />;
    case 'branded':
      return <BrandedTemplate {...templateProps} />;
    case 'two-column':
      return <TwoColumnTemplate {...templateProps} />;
    case 'funnel':
      return <FunnelTemplate {...templateProps} />;
    default:
      return <DefaultTemplate {...templateProps} />;
  }
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

