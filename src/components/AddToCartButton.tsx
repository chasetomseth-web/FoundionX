/**
 * AddToCartButton — Injectable buy button for storefront HTML pages
 * Uses the CartContext to add items and redirects to checkout
 */
'use client';

import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart, Loader2, Check } from 'lucide-react';

interface AddToCartButtonProps {
  productId?: string;
  offerId?: string;
  name: string;
  price: number;
  image?: string;
  variantId?: string;
  sku?: string;
  className?: string;
  redirectToCheckout?: boolean;
  storeId?: string;
  affiliateCode?: string;
  label?: string;
}

export default function AddToCartButton({
  productId,
  offerId,
  name,
  price,
  image,
  variantId,
  sku,
  className = '',
  redirectToCheckout = true,
  storeId,
  affiliateCode,
  label = 'Add to Cart',
}: AddToCartButtonProps) {
  const { addItem, itemCount } = useCart();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    addItem({
      name,
      price,
      quantity: 1,
      productId,
      offerId,
      variantId,
      images: image ? [image] : [],
      sku,
    });

    setAdded(true);
    setLoading(false);

    // Brief visual feedback
    setTimeout(() => setAdded(false), 1500);

    if (redirectToCheckout) {
      // Build checkout URL with store context
      const params = new URLSearchParams();
      if (storeId) params.set('storeId', storeId);
      if (offerId) params.set('offerId', offerId);
      if (productId) params.set('productId', productId);
      if (affiliateCode) params.set('ref', affiliateCode);

      // Small delay for the cart to update
      setTimeout(() => {
        window.location.href = `/checkout?${params.toString()}`;
      }, 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
        font-semibold text-sm transition-all
        bg-primary text-primary-foreground hover:bg-primary/90
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : added ? (
        <Check size={16} />
      ) : (
        <ShoppingCart size={16} />
      )}
      {added ? 'Added!' : loading ? 'Adding…' : label}
    </button>
  );
}