'use client';

import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { ArrowRight } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';

const statusMap: Record<string, 'success' | 'warning' | 'info' | 'muted'> = {
  fulfilled: 'success',
  delivered: 'success',
  pending: 'warning',
  processing: 'info',
  unfulfilled: 'warning',
  shipped: 'info',
  cancelled: 'muted',
};

const paymentMap: Record<string, 'success' | 'danger' | 'warning' | 'muted'> = {
  paid: 'success',
  failed: 'danger',
  pending: 'warning',
  refunded: 'muted',
};

export default function RecentOrdersPreview() {
  const { data, isLoading } = useOrders({ limit: 5, page: 1 });
  const orders = data?.orders ?? [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-600 text-foreground">Recent Orders</h2>
        <Link
          href="/orders-dashboard"
          className="flex items-center gap-1 text-sm text-primary font-500 hover:underline"
        >
          View all orders <ArrowRight size={14} />
        </Link>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-5 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Order</th>
              <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Product</th>
              <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Total</th>
              <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Fulfillment</th>
              <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Payment</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border animate-pulse">
                  <td className="px-5 py-3"><div className="h-4 bg-muted rounded w-12" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-24" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-32" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-20" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-12" /></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No orders yet
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const productName = order.items?.[0]?.name ?? '—';
                const total = typeof order.total === 'string' ? parseFloat(order.total) : (order.total ?? 0);
                return (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-600 text-primary tabular-nums">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-foreground">{order.customer?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[180px]">{productName}</td>
                    <td className="px-4 py-3 font-600 tabular-nums">${total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusMap[order.fulfillmentStatus] ?? 'muted'} dot>
                        {order.fulfillmentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={paymentMap[order.paymentStatus] ?? 'muted'} dot>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}