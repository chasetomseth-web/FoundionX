'use client';

import React, { useState } from 'react';
import { Package, Truck, CheckCircle2, Clock, ExternalLink, RefreshCw, Info } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import BackButton from '@/components/ui/back-button';

const FLOW_STEPS = [
  {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'Stripe Payment',
    desc: 'Customer pays → order created with status "paid"',
    email: 'Brevo: Order Confirmation',
  },
  {
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Create Label',
    desc: 'Admin opens order → fills address & parcel → shops rates → buys label',
    email: 'Brevo: Label Created',
  },
  {
    icon: Truck,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'Package Ships',
    desc: 'First carrier scan triggers Shippo webhook → status "shipped"',
    email: 'Brevo: Your Order Has Shipped',
  },
  {
    icon: Clock,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'In Transit Updates',
    desc: 'Shippo sends webhooks for each scan event',
    email: 'Brevo: Out for Delivery / Delivered',
  },
];

export default function ShippingPageContent() {
  const [copied, setCopied] = useState(false);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location?.origin : '');
  const webhookUrl = `${siteUrl}/api/webhooks/shippo`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div>
        <BackButton />
        <h1 className="text-2xl font-600 text-foreground">Shipping</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Shippo-powered label creation, rate shopping, and automated tracking updates</p>
      </div>
      {/* Status banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${process.env.NEXT_PUBLIC_SHIPPO_CONFIGURED === 'true' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-600 text-foreground">
            {process.env.NEXT_PUBLIC_SHIPPO_CONFIGURED === 'true' ? 'Shippo Connected' : 'Shippo Setup Required'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add your <code className="bg-muted px-1 rounded text-xs">SHIPPO_API_KEY</code> environment variable to enable label creation and tracking. Get your key at{' '}
            <a href="https://www.goshippo.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">goshippo.com</a>.
          </p>
        </div>
      </div>
      {/* Fulfillment flow */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-600 text-foreground mb-5">Fulfillment Pipeline</h2>
        <div className="flex flex-col gap-0">
          {FLOW_STEPS?.map((step, idx) => {
            const Icon = step?.icon;
            return (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${step?.bg} ${step?.color}`}>
                    <Icon size={16} />
                  </div>
                  {idx < FLOW_STEPS?.length - 1 && (
                    <div className="w-px flex-1 bg-border my-2" />
                  )}
                </div>
                <div className="pb-6 flex-1">
                  <p className="text-sm font-600 text-foreground">{step?.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step?.desc}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-muted text-[10px] font-500 text-muted-foreground">
                    📧 {step?.email}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Webhook setup */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-600 text-foreground mb-1">Shippo Webhook Setup</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Register this URL in your Shippo dashboard under <strong>Webhooks</strong> to receive tracking updates automatically.
        </p>
        <div className="flex items-center gap-2 bg-muted rounded-xl p-3">
          <code className="flex-1 text-xs text-foreground font-mono break-all">{webhookUrl}</code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 h-7 px-3 rounded-lg bg-foreground text-background text-xs font-600 hover:bg-foreground/90 transition-all"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
          <p className="font-600 text-foreground">Setup steps:</p>
          <ol className="list-decimal list-inside flex flex-col gap-1">
            <li>Log in to your <a href="https://app.goshippo.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Shippo dashboard</a></li>
            <li>Go to <strong>Account → Webhooks</strong></li>
            <li>Click <strong>Add Webhook</strong></li>
            <li>Paste the URL above and save</li>
            <li>Shippo will now send tracking events to your app automatically</li>
          </ol>
        </div>
      </div>
      {/* How to create a label */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-600 text-foreground mb-1">How to Create a Shipping Label</h2>
        <p className="text-xs text-muted-foreground mb-4">Labels are created from the Orders dashboard for each paid order.</p>
        <ol className="flex flex-col gap-3">
          {[
            'Go to Orders → click any paid order to open the detail panel',
            'Click "Create Shipping Label (Shippo)" to expand the form',
            'Enter the customer\'s shipping address and package dimensions',
            'Click "Get Shipping Rates" to see available carriers and prices',
            'Select your preferred rate and click "Buy Label & Create Shipment"',
            'The label PDF opens automatically — print it and attach to your package',
            'Customer receives an email: "Your order is being prepared"',
            'Once the carrier scans the package, Shippo sends a webhook → customer gets "Shipped" email with tracking link',
          ]?.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-sm text-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </div>
      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="/orders-dashboard"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors"
        >
          <Package size={18} className="text-primary" />
          <div>
            <p className="text-sm font-600 text-foreground">Orders Dashboard</p>
            <p className="text-xs text-muted-foreground">Create labels from orders</p>
          </div>
        </a>
        <a
          href="https://app.goshippo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors"
        >
          <ExternalLink size={18} className="text-primary" />
          <div>
            <p className="text-sm font-600 text-foreground">Shippo Dashboard</p>
            <p className="text-xs text-muted-foreground">Manage webhooks & account</p>
          </div>
        </a>
        <a
          href="/email/transactional"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors"
        >
          <RefreshCw size={18} className="text-primary" />
          <div>
            <p className="text-sm font-600 text-foreground">Email Templates</p>
            <p className="text-xs text-muted-foreground">Customize shipping emails</p>
          </div>
        </a>
      </div>
    </div>
  );
}
