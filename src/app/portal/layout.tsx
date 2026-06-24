/**
 * Customer Portal Layout
 * Provides shared navigation for customer self-service pages
 */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Package,
  CreditCard,
  ArrowLeft,
  User,
  Receipt,
  LogOut,
  Home,
  Shield,
  TrendingUp,
} from 'lucide-react';

const navItems = [
  { href: '/portal/dashboard', label: 'Home', icon: Home },
  { href: '/portal/orders', label: 'Orders', icon: Package },
  { href: '/portal/subscriptions', label: 'Subscriptions', icon: Receipt },
  { href: '/portal/billing', label: 'Billing', icon: CreditCard },
  { href: '/portal/account', label: 'Account', icon: Shield },
  { href: '/portal/affiliate', label: 'Affiliate', icon: TrendingUp },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-600 text-foreground hover:text-primary transition-colors">
              <ArrowLeft size={16} />
              Back to Store
            </Link>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm font-600 text-foreground">My Account</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <User size={14} />
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Nav tabs */}
        <nav className="flex items-center gap-1 mb-6 border-b border-border pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-500 rounded-t-lg
                  border-b-2 transition-all
                  ${isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Page content */}
        <main>{children}</main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} wiastro. All rights reserved.
        </div>
      </footer>
    </div>
  );
}