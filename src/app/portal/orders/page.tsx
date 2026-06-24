/**
 * Customer Portal — Order History
 * Displays order history for the logged-in customer
 */
'use client';

import React, { useState } from 'react';
import { Package, Search, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
};

export default function PortalOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch('/api/orders?customer=me&limit=50');
      const json = await res.json();
      setOrders(json.orders ?? json.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-700 text-foreground">Order History</h1>
          <p className="text-sm text-muted-foreground mt-1">View and track your past orders</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-background w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            {search ? 'No orders match your search.' : 'No orders yet.'}
          </p>
          <Link
            href="/"
            className="inline-block mt-4 text-sm text-primary hover:underline"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-600 text-foreground">#{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-500 px-2.5 py-1 rounded-full ${
                      STATUS_COLORS[order.status] || 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm font-700 text-foreground">
                    {order.currency} {order.total.toFixed(2)}
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </div>
              {order.items && order.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}