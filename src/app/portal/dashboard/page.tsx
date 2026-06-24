'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, CreditCard, Receipt, DollarSign, TrendingUp, Users } from 'lucide-react';

type CustomerData = {
  id: string;
  email: string;
  name: string | null;
  totalOrders: number;
  totalSpent: number;
  status: string;
};

type DashboardData = {
  customer: CustomerData;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    planName: string;
    status: string;
    amount: number;
    currency: string;
  }>;
  affiliateEarnings: number;
};

export default function PortalDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/customer/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        setData(data);
      })
      .catch(() => {
        router.push('/portal/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
        <Link href="/portal/login" className="text-primary hover:underline mt-2 inline-block">
          Sign In
        </Link>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Orders',
      value: data.customer.totalOrders,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Spent',
      value: `$${Number(data.customer.totalSpent).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Active Subscriptions',
      value: data.subscriptions.filter((s) => s.status === 'active').length,
      icon: Receipt,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Affiliate Earnings',
      value: `$${data.affiliateEarnings.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{data.customer.name ? `, ${data.customer.name}` : ''}!
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's an overview of your account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold text-foreground">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
          <Link href="/portal/orders" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No orders yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">#{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {order.currency} {Number(order.total).toFixed(2)}
                    </p>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                        order.status === 'delivered'
                          ? 'bg-green-50 text-green-700'
                          : order.status === 'processing'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Subscriptions */}
      {data.subscriptions.filter((s) => s.status === 'active').length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Active Subscriptions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.subscriptions
              .filter((s) => s.status === 'active')
              .map((sub) => (
                <div key={sub.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{sub.planName}</p>
                      <p className="text-xs text-muted-foreground">{sub.currency} {Number(sub.amount).toFixed(2)}/mo</p>
                    </div>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}