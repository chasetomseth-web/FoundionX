/**
 * Cart Context — Global shopping cart state for storefront shoppers
 * Persisted in sessionStorage, supports SSR hydration
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  productId?: string;
  offerId?: string;
  variantId?: string;
  images?: string[];
  sku?: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'mos_cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialized = useRef(false);

  // Hydrate from storage on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setItems(loadCart());
      setIsLoaded(true);
    }
  }, []);

  // Persist to storage on change
  useEffect(() => {
    if (isLoaded) {
      saveCart(items);
    }
  }, [items, isLoaded]);

  // Expose cart globally for storefront injection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__MOS_CART = items;
      (window as unknown as Record<string, unknown>).__MOS_ON_CART_UPDATE = (updated: CartItem[]) => {
        setItems(updated);
      };
    }
  }, [items]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.findIndex(
        (i) => i.productId === item.productId && i.offerId === item.offerId
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + (item.quantity || 1),
        };
        return updated;
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  return (
    <CartContext.Provider
      value={{ items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart, isLoaded }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}