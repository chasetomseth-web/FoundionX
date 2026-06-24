'use client';

import React, { useState, useEffect } from 'react';
import type { Order } from './ordersData';
import Badge from '@/components/ui/Badge';
import OrderStatusDropdown from './OrderStatusDropdown';
import { Eye, MoreHorizontal, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface Props {
  orders: Order[];
  selectedIds: string[];
  onSelectId: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onViewOrder: (order: Order) => void;
}

type SortKey = 'orderNumber' | 'customer' | 'total' | 'createdAt';
type SortDir = 'asc' | 'desc';

const paymentBadgeMap: Record<string, 'success' | 'danger' | 'warning' | 'muted'> = {
  paid: 'success',
  failed: 'danger',
  pending: 'warning',
  refunded: 'muted',
};

export default function OrdersTable({ orders, selectedIds, onSelectId, onSelectAll, onViewOrder }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  // Sync local orders when prop changes
  React.useEffect(() => { setLocalOrders(orders); }, [orders]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...localOrders].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'total') cmp = a.total - b.total;
    else if (sortKey === 'orderNumber') cmp = a.orderNumber.localeCompare(b.orderNumber);
    else if (sortKey === 'customer') cmp = a.customer.name.localeCompare(b.customer.name);
    else if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleStatusChange = (orderId: string, newStatus: Order['fulfillmentStatus']) => {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, fulfillmentStatus: newStatus } : o))
    );
    // BACKEND INTEGRATION: PATCH /api/orders/:id — update fulfillment status
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-muted-foreground opacity-50" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-primary" />
    ) : (
      <ArrowDown size={12} className="text-primary" />
    );
  };

  const allSelected = sorted.length > 0 && sorted.every((o) => selectedIds.includes(o.id));

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-xl border border-border bg-card">
      <table className="w-full text-sm min-w-[1100px]">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
                aria-label="Select all orders"
              />
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
              onClick={() => handleSort('orderNumber')}
            >
              <div className="flex items-center gap-1.5">Order <SortIcon col="orderNumber" /></div>
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
              onClick={() => handleSort('customer')}
            >
              <div className="flex items-center gap-1.5">Customer <SortIcon col="customer" /></div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Products</th>
            <th
              className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
              onClick={() => handleSort('total')}
            >
              <div className="flex items-center gap-1.5">Total <SortIcon col="total" /></div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Payment</th>
            <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Fulfillment</th>
            <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Affiliate</th>
            <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Stripe TXN</th>
            <th
              className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none"
              onClick={() => handleSort('createdAt')}
            >
              <div className="flex items-center gap-1.5">Date <SortIcon col="createdAt" /></div>
            </th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((order) => {
            const isSelected = selectedIds.includes(order.id);
            const date = new Date(order.createdAt);
            const dateStr = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            return (
              <tr
                key={order.id}
                className={`border-b border-border last:border-0 transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                }`}
                onClick={() => onViewOrder(order)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectId(order.id)}
                    className="w-4 h-4 rounded border-input accent-primary"
                    aria-label={`Select order ${order.orderNumber}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-600 text-primary tabular-nums">{order.orderNumber}</span>
                  {order.subscriptionOrder && (
                    <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-600">SUB</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-500 text-foreground whitespace-nowrap">{order.customer.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[160px]">{order.customer.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground truncate max-w-[200px]">{order.products}</p>
                  <p className="text-xs text-muted-foreground">{order.items} item{order.items !== 1 ? 's' : ''}</p>
                </td>
                <td className="px-4 py-3 font-600 tabular-nums whitespace-nowrap">${order.total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge variant={paymentBadgeMap[order.paymentStatus]} dot>
                    {order.paymentStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <OrderStatusDropdown
                    value={order.fulfillmentStatus}
                    onChange={(v) => handleStatusChange(order.id, v)}
                  />
                </td>
                <td className="px-4 py-3">
                  {order.affiliate ? (
                    <span className="text-xs text-muted-foreground tabular-nums">{order.affiliate}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground tabular-nums font-mono truncate max-w-[130px] block">
                    {order.stripeTransactionId.slice(0, 18)}…
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">{dateStr}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => onViewOrder(order)}
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`View order ${order.orderNumber}`}
                      title={`View order ${order.orderNumber}`}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="More actions"
                      title="More actions"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-500 text-muted-foreground">No orders match your current filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}