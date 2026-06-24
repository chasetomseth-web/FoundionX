'use client';

import { useEffect } from 'react';

/**
 * Sets the funnel_slug cookie when a user enters a funnel page.
 * This cookie is read by /checkout/success to determine if
 * the user should be redirected to an upsell step after purchase.
 */
export default function FunnelCookieSetter({ slug }: { slug: string }) {
  useEffect(() => {
    // Set cookie with 24h expiry, accessible on all paths
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `funnel_slug=${encodeURIComponent(slug)}; path=/; expires=${expires}; SameSite=Lax`;
  }, [slug]);

  return null;
}