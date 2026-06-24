'use client';

import React, { useState } from 'react';
import { CheckoutTemplateProps } from './types';
import { Loader2, Lock, ShieldCheck, Star, ChevronDown } from 'lucide-react';

export default function FunnelTemplate({ items, subtotal, loading, error, onCheckout, couponCode, affiliateCode }: CheckoutTemplateProps) {
  const [orderBumpChecked, setOrderBumpChecked] = useState(false);
  const bumpPrice = 9.97;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const total = subtotal + (orderBumpChecked ? bumpPrice : 0);

  const faqs = [
    { q: 'How does the 30-day guarantee work?', a: 'If you\'re not satisfied with your purchase for any reason, simply contact us within 30 days for a full refund. No questions asked.' },
    { q: 'Is my payment information secure?', a: 'Absolutely. All payments are processed securely through Stripe. We never store your credit card details on our servers.' },
    { q: 'How quickly will I get access?', a: 'Immediately after your payment is confirmed, you\'ll receive access to your purchase with instructions sent to your email.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[680px] mx-auto px-4 py-8 md:py-16">
        {/* Attention Headline */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-800 text-gray-900 leading-tight mb-4">
            {items[0]?.name ? `Get Started with ${items[0].name} Today` : 'Complete Your Purchase'}
          </h1>
          <p className="text-lg text-gray-600">Transform the way you work — start now with instant access.</p>
        </div>

        {/* Guarantee Badge */}
        <div className="flex items-center justify-center gap-2 mb-8 p-3 rounded-xl bg-green-50 border border-green-200">
          <ShieldCheck size={18} className="text-green-600 flex-shrink-0" />
          <span className="text-sm font-500 text-green-700">30-Day Money-Back Guarantee — Risk-Free</span>
        </div>

        {/* Checkout Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input type="text" placeholder="John" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input type="text" placeholder="Doe" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" placeholder="john@example.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Information</label>
            <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 flex items-center gap-2">
              <Lock size={14} />
              <span>Collected securely via Stripe</span>
            </div>
          </div>
        </div>

        {/* Order Bump */}
        <div className="mb-8 p-4 rounded-xl border-2 border-[#e8556d]/30 bg-[#e8556d]/5">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={orderBumpChecked}
              onChange={e => setOrderBumpChecked(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-[#e8556d] focus:ring-[#e8556d]"
            />
            <div>
              <p className="text-sm font-600 text-gray-900">
                Add <span className="text-[#e8556d]">Pro Upgrade</span> for just ${bumpPrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Get premium features, priority support, and exclusive content.</p>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-8">
          <h3 className="text-sm font-600 text-gray-900 mb-4 text-center">What Our Customers Say</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { name: 'Sarah M.', text: 'This completely transformed my workflow. Highly recommend!' },
              { name: 'James R.', text: 'Incredible value for the price. The results speak for themselves.' },
              { name: 'Emily K.', text: 'Easy to set up and the support team is amazing.' },
            ].map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex gap-0.5 mb-2">
                  {[1,2,3,4,5].map(s => <Star key={s} size={11} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-xs text-gray-600 mb-2">"{t.text}"</p>
                <p className="text-xs font-600 text-gray-900">{t.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="mb-8">
          <h3 className="text-sm font-600 text-gray-900 mb-4 text-center">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-500 text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  {faq.q}
                  <ChevronDown size={14} className={`transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-sm text-gray-600">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Security Badges */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck size={12} /> Secure Checkout
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock size={12} /> SSL Encrypted
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck size={12} /> 30-Day Guarantee
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-center">{error}</div>
        )}

        {/* Final CTA */}
        <div className="text-center">
          <button
            onClick={onCheckout}
            disabled={loading || items.length === 0}
            className="w-full h-14 rounded-2xl bg-[#e8556d] text-white text-base font-700 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[#e8556d]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Processing…</>
            ) : (
              <><Lock size={16} /> Complete My Order — ${total.toFixed(2)}</>
            )}
          </button>
          <p className="text-xs text-gray-400 mt-3">Your payment is secure and encrypted</p>
        </div>

        {affiliateCode && (
          <p className="text-center text-xs text-gray-500 mt-6">
            Referred by: <span className="font-600">{affiliateCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}