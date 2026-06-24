'use client';

import React from 'react';
import { CheckoutTemplateProps } from './types';
import { Loader2, Lock } from 'lucide-react';

export default function MinimalTemplate({ items, subtotal, loading, error, onCheckout }: CheckoutTemplateProps) {
  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-6 py-12">
      <div className="w-full max-w-[480px]">
        {/* Small logo */}
        <div className="text-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center mx-auto">
            <Lock size={14} className="text-white" />
          </div>
        </div>

        {/* Checkout heading */}
        <h1 className="text-2xl font-300 text-gray-900 text-center mb-8">Checkout</h1>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-xs font-500 text-gray-500 uppercase tracking-wider mb-2">Email</label>
          <input
            type="email"
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 focus:ring-0 transition-colors bg-gray-50"
          />
        </div>

        {/* Card info placeholder */}
        <div className="mb-8">
          <label className="block text-xs font-500 text-gray-500 uppercase tracking-wider mb-2">Card Information</label>
          <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Lock size={13} />
              <span>Card details collected securely via Stripe</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 mb-1">Total</p>
          <p className="text-4xl font-200 text-gray-900">${subtotal.toFixed(2)}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-center">{error}</div>
        )}

        {/* Buy Now button */}
        <button
          onClick={onCheckout}
          disabled={loading || items.length === 0}
          className="w-full h-14 rounded-2xl bg-gray-900 text-white text-base font-500 flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Processing…</>
          ) : (
            <>Buy Now — ${subtotal.toFixed(2)}</>
          )}
        </button>
      </div>
    </div>
  );
}