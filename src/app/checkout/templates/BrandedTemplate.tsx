'use client';

import React from 'react';
import { CheckoutTemplateProps, CheckoutItem } from './types';
import { Loader2, Lock, ShieldCheck, Star, ShoppingBag } from 'lucide-react';

interface BrandedTemplateProps extends CheckoutTemplateProps {
  brandColor?: string;
  brandName?: string;
}

export default function BrandedTemplate({
  items, subtotal, loading, error, onCheckout, couponCode, affiliateCode,
  brandColor = '#111827', brandName = 'wiastro'
}: BrandedTemplateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 py-8">
      <div className="w-full max-w-[680px]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${brandColor}10` }}>
            <ShoppingBag size={28} style={{ color: brandColor }} />
          </div>
          {items[0]?.images?.[0] && (
            <img src={items[0].images[0]} alt={items[0].name} className="w-20 h-20 rounded-xl object-cover mx-auto mb-3 shadow-sm" />
          )}
          <h1 className="text-2xl font-700 text-gray-900">{items[0]?.name || 'Complete Your Order'}</h1>
          <p className="text-sm text-gray-500 mt-1">Powered by {brandName}</p>
        </div>

        {/* Checkout Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider">Contact</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" placeholder="John" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" placeholder="Doe" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" placeholder="john@example.com" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>

          <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider pt-2">Billing</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" placeholder="123 Main St" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input type="text" placeholder="City" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">State</label><input type="text" placeholder="State" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Zip</label><input type="text" placeholder="12345" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" /></div>
          </div>

          <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider pt-2">Payment</h2>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3">
              <Lock size={14} className="text-gray-500" />
              <p className="text-sm text-gray-600">Securely handled by Stripe</p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-4">
          <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider mb-4">Order Summary</h2>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center gap-2">
                {item.images?.[0] && <img src={item.images[0]} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />}
                <div>
                  <p className="text-sm font-500 text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
              </div>
              <p className="text-sm font-600">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="flex justify-between text-sm py-2 mt-2">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-600 text-gray-900">${subtotal.toFixed(2)}</span>
          </div>
          {couponCode && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-green-600">Coupon ({couponCode})</span>
              <span className="text-green-600 font-600">Applied ✓</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-3 border-t border-gray-200 mt-2">
            <span className="font-600 text-gray-900">Total</span>
            <span className="font-700 text-lg" style={{ color: brandColor }}>${subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="flex">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} className="text-yellow-400 fill-yellow-400" />)}
          </div>
          <span className="text-sm text-gray-500">4.8 average from 128 reviews</span>
        </div>

        {/* Guarantee Badge */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <ShieldCheck size={16} className="text-green-500" />
          <span className="text-sm text-gray-500">30-Day Money-Back Guarantee</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {/* CTA */}
        <div className="mt-6">
          <button
            onClick={onCheckout}
            disabled={loading || items.length === 0}
            className="w-full h-12 rounded-xl text-white font-600 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: brandColor }}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Processing…</>
            ) : (
              <><Lock size={15} /> Complete Order</>
            )}
          </button>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-4 mt-6 pb-8">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck size={12} /> SSL Secure
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock size={12} /> Encrypted
          </div>
        </div>

        {affiliateCode && (
          <p className="text-center text-xs text-gray-500 mt-2 pb-4">
            Referred by: <span className="font-600">{affiliateCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}