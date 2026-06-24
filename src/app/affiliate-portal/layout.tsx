/**
 * Affiliate Portal Layout
 * Shared navigation for affiliate self-service
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Link2,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';

const navItems = [
  { href: '/affiliate-portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/affiliate-portal/commissions', label: 'Commissions', icon: DollarSign },
  { href: '/affiliate-portal/referrals', label: 'Referrals', icon: Users },
  { href: '/affiliate-portal/payouts', label: 'Payouts', icon: BarChart3 },
];

export default function AffiliatePortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-600 text-foreground hover:text-primary transition-colors">
              <ArrowLeft size={16} />
              Back
            </Link>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm font-600 text-foreground">Affiliate Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Nav tabs */}
        <nav className="flex items-center gap-1 mb-6 border-b border-border pb-0 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-500 rounded-t-lg whitespace-nowrap
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

      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} wiastro Affiliate Program
        </div>
      </footer>
    </div>
  );
}