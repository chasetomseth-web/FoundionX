'use client';

import React from 'react';
import { CheckoutTemplateProps } from './types';
import { Loader2, Lock, ShieldCheck, ShoppingBag } from 'lucide-react';

export default function TwoColumnTemplate({ items, subtotal, loading, error, onCheckout, couponCode, affiliateCode }: CheckoutTemplateProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[65%_35%] min-h-screen">
        {/* Mobile: Summary on top */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            {items[0]?.images?.[0] && (
              <img src={items[0].images[0]} alt={items[0].name} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
            )}
            <div className="flex-1">
              <p className="text-sm font-500 text-gray-900">{items[0]?.name || 'Order Summary'}</p>
              <p className="text-lg font-700 text-gray-900">${subtotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Left Column — Form */}
        <div className="p-4 md:p-8 lg:p-12">
          <div className="max-w-lg mx-auto lg:mx-0">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#e8556d]/10 flex items-center justify-center">
                <ShoppingBag size={16} className="text-[#e8556d]" />
              </div>
              <span className="text-sm font-600 text-gray-900">Checkout</span>
            </div>

            {/* Contact */}
            <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider mb-4">Contact Information</h2>
            <div className="space-y-3 mb-6">
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
            </div>

            {/* Billing */}
            <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider mb-4">Billing Address</h2>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" placeholder="123 Main St" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input type="text" placeholder="City" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">State</label><input type="text" placeholder="State" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Zip</label><input type="text" placeholder="12345" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] focus:ring-1 focus:ring-[#e8556d]/30 transition-colors bg-white">
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                  <option>Australia</option>
                </select>
              </div>
            </div>

            {/* Payment */}
            <h2 className="text-sm font-600 text-gray-900 uppercase tracking-wider mb-4">Payment</h2>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 mb-6">
              <div className="flex items-center gap-3">
                <Lock size={14} className="text-gray-500" />
                <p className="text-sm text-gray-600">Redirecting to Stripe secure payment</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}

            {/* CTA */}
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

            {affiliateCode && (
              <p className="text-center text-xs text-gray-500 mt-4">
                Referred by: <span className="font-600">{affiliateCode}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Column — Sticky Summary (desktop) */}
        <div className="hidden lg:block bg-white border-l border-gray-200 p-8">
          <div className="sticky top-8 space-y-6">
            {/* Product */}
            {items[0]?.images?.[0] && (
              <div className="flex items-center gap-4">
                <img src={items[0].images[0]} alt={items[0].name} className="w-20 h-20 rounded-xl object-cover bg-gray-100 shadow-sm" />
                <div>
                  <p className="text-base font-600 text-gray-900">{items[0]?.name || 'Product'}</p>
                  <p className="text-sm text-gray-500">Qty: {items.reduce((s, i) => s + i.quantity, 0)}</p>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-600 text-gray-900">${subtotal.toFixed(2)}</span>
            </div>

            {/* Coupon */}
            <div>
              <label className="block text-xs font-500 text-gray-500 uppercase tracking-wider mb-2">Coupon Code</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter code" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#e8556d] transition-colors" />
                <button className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-500 text-gray-700 hover:bg-gray-200 transition-colors">Apply</button>
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-500 text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="text-gray-500">Calculated at next step</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-500">Calculated at next step</span>
              </div>
              {couponCode && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Coupon ({couponCode})</span>
                  <span className="text-green-600 font-600">Applied ✓</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-3 border-t border-gray-200">
                <span className="font-600 text-gray-900">Total</span>
                <span className="font-700 text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Guarantee Badge */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <ShieldCheck size={16} className="text-green-600 flex-shrink-0" />
              <span className="text-xs text-green-700">30-Day Money-Back Guarantee</span>
            </div>

            {/* SSL Badge */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Lock size={11} />
              <span>SSL Encrypted Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}