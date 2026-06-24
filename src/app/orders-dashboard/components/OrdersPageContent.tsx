'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders, useOrderKPIs, type LiveOrder } from '@/hooks/useOrders';
import OrdersKPIRow from './OrdersKPIRow';
import OrdersFilters from './OrdersFilters';
import OrdersTable from './OrdersTable';
import OrdersPagination from './OrdersPagination';
import BulkActionBar from './BulkActionBar';
import OrderDetailPanel from './OrderDetailPanel';
import { Plus, RefreshCw, Wifi, Download } from 'lucide-react';
import type { Order } from './ordersData';
import BackButton from '@/components/ui/back-button';

// Adapter: convert LiveOrder to legacy Order shape for existing table/panel components
function adaptOrder(o: LiveOrder): Order {
  const firstItem = o.items?.[0];
  const productNames = o.items?.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`).join(', ') ?? '';
  const firstShipment = o.shipments?.[0];

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customer: {
      name: o.customer?.name ?? 'Unknown',
      email: o.customer?.email ?? '',
    },
    products: productNames || (firstItem?.name ?? '—'),
    total: typeof o.total === 'string' ? parseFloat(o.total) : (o.total ?? 0),
    paymentStatus: (o.paymentStatus as Order['paymentStatus']) ?? 'pending',
    fulfillmentStatus: (o.fulfillmentStatus as Order['fulfillmentStatus']) ?? 'unfulfilled',
    affiliate: o.affiliateCode ?? null,
    stripeTransactionId: o.stripePaymentIntentId ?? '',
    carrier: firstShipment?.carrier ?? null,
    trackingNumber: firstShipment?.trackingNumber ?? null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items?.length ?? 0,
    subscriptionOrder: o.isSubscriptionOrder ?? false,
  };
}

export default function OrdersPageContent() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [affiliateFilter, setAffiliateFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isFetching, refetch } = useOrders({
    page: currentPage,
    limit: pageSize,
    search: search || undefined,
    paymentStatus: paymentFilter || undefined,
    fulfillmentStatus: fulfillmentFilter || undefined,
    affiliateId: affiliateFilter || undefined,
  });

  const { data: kpiData } = useOrderKPIs();

  const orders = useMemo(() => (data?.orders ?? []).map(adaptOrder), [data]);
  const totalItems = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  const handleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? orders.map((o) => o.id) : []);
  };

  const handleExportCSV = async () => {
    try {
      // Fetch ALL orders matching current filters (not just current page)
      const params = new URLSearchParams();
      params.set('limit', '10000'); // Large number to get all
      if (search) params.set('search', search);
      if (paymentFilter) params.set('paymentStatus', paymentFilter);
      if (fulfillmentFilter) params.set('fulfillmentStatus', fulfillmentFilter);
      if (affiliateFilter) params.set('affiliateId', affiliateFilter);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      
      const { orders: allOrders } = await res.json();

      // Convert to CSV
      const headers = [
        'Order ID',
        'Date',
        'Customer Name',
        'Customer Email',
        'Products',
        'Subtotal',
        'Discount',
        'Shipping',
        'Tax',
        'Total',
        'Payment Status',
        'Fulfillment Status',
        'Affiliate',
        'Stripe TXN ID',
      ];

      const rows = allOrders.map((order: any) => {
        const productNames = order.items?.map((i: any) => `${i.product?.name || i.name} × ${i.quantity}`).join('; ') || '';
        const affiliateName = order.affiliate?.name || order.affiliateCode || '';
        
        return [
          order.orderNumber || order.id,
          new Date(order.createdAt).toLocaleDateString(),
          order.customer?.name || '',
          order.customer?.email || '',
          productNames,
          order.subtotal || 0,
          order.discountTotal || 0,
          order.shippingTotal || 0,
          order.taxTotal || 0,
          order.total || 0,
          order.paymentStatus || '',
          order.fulfillmentStatus || '',
          affiliateName,
          order.stripePaymentIntentId || '',
        ];
      });

      const csv = [
        headers.join(','),
        ...rows.map((row: any[]) => 
          row.map(cell => {
            const str = String(cell);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',')
        ),
      ].join('\n');

      // Trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `orders-export-${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <BackButton />
          <h1 className="text-2xl font-600 text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {isLoading ? (
              'Loading orders…'
            ) : (
              <>
                {totalItems} order{totalItems !== 1 ? 's' : ''}
                {isFetching && !isLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <RefreshCw size={10} className="animate-spin" /> syncing
                  </span>
                )}
                {!isFetching && (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <Wifi size={10} /> live
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm font-500 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => router.push('/orders-dashboard/create')}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-sm font-600 hover:bg-foreground/90 active:scale-[0.98] transition-all"
          >
            <Plus size={15} />
            Create Order
          </button>
        </div>
      </div>

      {/* KPIs */}
      <OrdersKPIRow kpiData={kpiData} isLoading={isLoading} />

      {/* Filters */}
      <OrdersFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}
        fulfillmentFilter={fulfillmentFilter}
        onFulfillmentFilterChange={(v) => { setFulfillmentFilter(v); setCurrentPage(1); }}
        affiliateFilter={affiliateFilter}
        onAffiliateFilterChange={(v) => { setAffiliateFilter(v); setCurrentPage(1); }}
        onExportCSV={handleExportCSV}
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading orders from database…</span>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <OrdersTable
          orders={orders}
          selectedIds={selectedIds}
          onSelectId={handleSelectId}
          onSelectAll={handleSelectAll}
          onViewOrder={setActiveOrder}
        />
      )}

      {/* Pagination */}
      {!isLoading && (
        <OrdersPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
        />
      )}

      {/* Bulk actions */}
      <BulkActionBar selectedCount={selectedIds.length} onClear={() => setSelectedIds([])} />

      {/* Order detail slide-over */}
      <OrderDetailPanel order={activeOrder} onClose={() => setActiveOrder(null)} />
    </div>
  );
}