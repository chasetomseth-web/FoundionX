'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Users, FileText, Inbox, BarChart2, Settings } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';



const emailNavItems = [
  { href: '/email', label: 'Campaigns', icon: Mail, exact: true },
  { href: '/email/contacts', label: 'Contacts', icon: Users },
  { href: '/email/transactional', label: 'Transactional', icon: FileText },
  { href: '/email/inbox', label: 'Inbox', icon: Inbox },
  { href: '/email/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/email/settings', label: 'Settings', icon: Settings },
];

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 -mt-6 -mx-6 lg:-mx-8 xl:-mx-10">
      {/* Sub-navigation */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-1 px-6 lg:px-8 xl:px-10 overflow-x-auto">
          {emailNavItems.map((item) => {
            const Icon = item.icon;
            const isExactActive = item.exact && pathname === item.href;
            const isSubActive = !item.exact && pathname.startsWith(item.href);
            const active = isExactActive || isSubActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-500 border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="px-6 lg:px-8 xl:px-10 pb-8">
        {children}
      </div>
    </div>
  );
}
