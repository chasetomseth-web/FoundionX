'use client';

import AppLogo from '@/components/ui/AppLogo';
import { CheckCircle2, Zap, BarChart3, Link2 } from 'lucide-react';

const features = [
  { key: 'feat-orders', icon: CheckCircle2, text: 'Orders, fulfillment & shipping in one place' },
  { key: 'feat-stripe', icon: Zap, text: 'Stripe-powered payments with reconciliation' },
  { key: 'feat-analytics', icon: BarChart3, text: 'Real-time revenue analytics & reporting' },
  { key: 'feat-affiliate', icon: Link2, text: 'Built-in affiliate & commission management' },
];

const stats = [
  { key: 'stat-gmv', value: '$2.4M+', label: 'GMV processed' },
  { key: 'stat-orders', value: '18,400+', label: 'Orders managed' },
  { key: 'stat-affiliates', value: '1,200+', label: 'Active affiliates' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-3xl">
          <div className="flex flex-col items-center text-center mb-10">
            <AppLogo size={48} className="mb-6" />
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-500 w-fit mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Platform status: All systems operational
            </span>
            <h1 className="text-4xl xl:text-5xl font-800 text-foreground leading-tight mb-4">
              Your entire store.<br />One dashboard.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
              wiastro replaces Shopify, GoAffPro, and Brevo with a single, fast operating system built for modern e-commerce merchants.
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-10">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={13} className="text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{f.text}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.key} className="rounded-xl p-4 border border-input bg-card">
                <p className="text-xl font-700 text-foreground tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">© 2026 wiastro. All rights reserved.</p>
      </footer>
    </div>
  );
}
