'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Mail, Repeat2, Link2, Settings, ChevronLeft, ChevronRight, Tag, Globe, Rocket, MessageSquare, Crosshair, Zap, Truck, LogOut, ArrowRight, Activity, Target, Server } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';


interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  group: string;
}

const navItems: NavItem[] = [
  { key: 'nav-overview', label: 'Overview', href: '/', icon: LayoutDashboard, group: 'main' },
  { key: 'nav-orders', label: 'Orders', href: '/orders-dashboard', icon: ShoppingCart, badge: 0, group: 'main' },
  { key: 'nav-products', label: 'Products', href: '/products', icon: Package, group: 'main' },
  { key: 'nav-customers', label: 'Customers', href: '/customers', icon: Users, group: 'main' },
  { key: 'nav-storefront', label: 'Pagebuilder', href: '/pagebuilder', icon: Globe, group: 'main' },
  { key: 'nav-reporting', label: 'Reporting', href: '/reporting-dashboard', icon: BarChart3, group: 'analytics' },
  { key: 'nav-email', label: 'Email & Automation', href: '/email', icon: Mail, badge: 0, group: 'analytics' },
  { key: 'nav-inbox', label: 'Support Inbox', href: '/email/inbox', icon: MessageSquare, group: 'analytics' },
  { key: 'nav-cold-outreach', label: 'Cold Outreach', href: '/cold-outreach', icon: Crosshair, group: 'analytics' },
  { key: 'nav-merchantsell', label: 'Merchantsell', href: '/merchantsell', icon: ShoppingCart, group: 'main' },
  { key: 'nav-merchant-affiliate', label: 'Merchant Affiliate', href: '/merchant-affiliate', icon: Link2, group: 'analytics' },
  { key: 'nav-affiliates', label: 'Affiliates', href: '/affiliates', icon: Link2, group: 'analytics' },

  { key: 'nav-subscriptions', label: 'Subscriptions', href: '/subscriptions', icon: Repeat2, group: 'analytics' },
  { key: 'nav-coupons', label: 'Coupons & Upsells', href: '/coupons', icon: Tag, group: 'tools' },
  { key: 'nav-upsell-funnels', label: 'Funnels', href: '/upsell-funnels', icon: Zap, group: 'tools' },
  { key: 'nav-shipping', label: 'Shipping', href: '/shipping', icon: Truck, group: 'tools' },
  { key: 'nav-onboarding', label: 'Onboarding', href: '/onboarding', icon: Rocket, group: 'tools' },
  { key: 'nav-retention', label: 'Retention', href: '/retention', icon: Activity, group: 'tools' },
  { key: 'nav-saleseeker', label: 'Saleseeker', href: '/tools/saleseeker', icon: Target, group: 'tools' },
  { key: 'nav-dns', label: 'DNS', href: '/sites', icon: Server, group: 'tools' },
  { key: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings, group: 'system' },
];

const groupLabels: Record<string, string> = {
  main: 'Store',
  analytics: 'Analytics',
  tools: 'Tools',
  system: 'System',
};

function UserSection() {
  const { user } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const initials = (displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)) || displayEmail[0]?.toUpperCase() || 'U';

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-700">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-600 text-foreground truncate">{displayName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{displayEmail}</p>
        </div>
      </div>
    </div>
  );
}

function useOrderBadgeCount() {
  return useQuery({
    queryKey: ['order-badge-count'],
    queryFn: async () => {
      const res = await fetch('/api/orders/count?fulfillmentStatus=unfulfilled,pending');
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count ?? 0;
    },
    refetchInterval: 30 * 1000, // poll every 30s
    placeholderData: (prev) => prev,
  });
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: orderBadgeCount = 0 } = useOrderBadgeCount();

  const groups = ['main', 'analytics', 'tools', 'system'];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside
      className={`relative flex flex-col bg-card border-r border-border h-screen sticky top-0 sidebar-transition ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-border px-3 ${collapsed ? 'justify-center' : 'gap-2 px-4'}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-bold text-base text-foreground tracking-tight">wiastro</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group);
          return (
            <div key={`group-${group}`} className="mb-1">
              {!collapsed && (
                <p className="px-4 py-1.5 text-[10px] font-600 uppercase tracking-widest text-muted-foreground">
                  {groupLabels[group]}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                // Apply live badge count for the Orders nav item
                const badge = item.key === 'nav-orders' ? orderBadgeCount : item.badge;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-primary/10 text-primary' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && badge !== undefined && badge > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-700 tabular-nums">
                        {badge}
                      </span>
                    )}
                    {collapsed && badge !== undefined && badge > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`group relative flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger-bg transition-all duration-150 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="flex-1 truncate text-left">Logout</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
              Logout
            </div>
          )}
        </button>
      </div>

      {/* User */}
      {!collapsed && (
        <UserSection />
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}