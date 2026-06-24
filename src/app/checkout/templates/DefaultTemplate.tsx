'use client';

import React from 'react';
import { CheckoutTemplateProps } from './types';
import { Loader2, Lock, ShieldCheck, ShoppingBag } from 'lucide-react';

export default function DefaultTemplate({ items, subtotal, loading, error, onCheckout, couponCode, affiliateCode }: CheckoutTemplateProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 py-8">
      <div className="w-full max-w-[750px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#e8556d]/10 flex items-center justify-center mx-auto mb-2">
            <ShoppingBag size={22} className="text-[#e8556d]" />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Headline */}
          <div className="p-6 pb-0">
            <h1 className="text-xl font-700 text-gray-900">Complete Your Order</h1>
            <p className="text-sm text-gray-500 mt-1">Fill in your details and we'll handle the rest.</p>
          </div>

          {/* Contact & Billing Fields */}
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider">Contact Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" placeholder="John" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" placeholder="Doe" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" placeholder="john@example.com" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" />
            </div>

            <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider pt-2">Billing Address</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" placeholder="123 Main St" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" placeholder="City" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" placeholder="State" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                <input type="text" placeholder="12345" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors bg-white">
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
                <option>Australia</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* Payment Section */}
          <div className="px-6 pb-2">
            <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider mb-3">Payment</h2>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#e8556d]/10 flex items-center justify-center">
                  <Lock size={14} className="text-[#e8556d]" />
                </div>
                <p className="text-sm text-gray-600">Redirecting to Stripe secure payment</p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="px-6 pt-4 pb-2">
            <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider mb-3">Order Summary</h2>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-2">
                    {item.images?.[0] && (
                      <img src={item.images[0]} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                    )}
                    <div>
                      <p className="text-sm font-500 text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="text-sm font-600 text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="px-6 pb-4">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-600 text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            {couponCode && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-green-600">Coupon ({couponCode})</span>
                <span className="text-green-600 font-600">Applied ✓</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2">
              <span className="font-600 text-gray-900">Total</span>
              <span className="font-700 text-gray-900 text-base">${subtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="px-6 pb-6">
            {error && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}
            <button
              onClick={onCheckout}
              disabled={loading || items.length === 0}
              className="w-full h-12 rounded-xl bg-[#e8556d] text-white font-600 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Processing…</>
              ) : (
                <><Lock size={15} /> Complete Order</>
              )}
            </button>
          </div>

          {/* Trust Badges */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ShieldCheck size={13} className="text-green-500" />
                ✓ Secure Checkout
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ShieldCheck size={13} className="text-green-500" />
                SSL Protected
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ShieldCheck size={13} className="text-green-500" />
                30-Day Guarantee
              </div>
            </div>
          </div>
        </div>

        {affiliateCode && (
          <p className="text-center text-xs text-gray-500 mt-4">
            Referred by: <span className="font-600">{affiliateCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}