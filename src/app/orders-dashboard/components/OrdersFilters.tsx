'use client';

import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, Download, X } from 'lucide-react';

interface OrdersFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (v: string) => void;
  fulfillmentFilter: string;
  onFulfillmentFilterChange: (v: string) => void;
  affiliateFilter: string;
  onAffiliateFilterChange: (v: string) => void;
  onExportCSV?: () => void;
}

const paymentOptions = [
  { key: 'pf-all', value: '', label: 'All Payments' },
  { key: 'pf-paid', value: 'paid', label: 'Paid' },
  { key: 'pf-failed', value: 'failed', label: 'Failed' },
  { key: 'pf-refunded', value: 'refunded', label: 'Refunded' },
  { key: 'pf-pending', value: 'pending', label: 'Pending' },
];

const fulfillmentOptions = [
  { key: 'ff-all', value: '', label: 'All Fulfillment' },
  { key: 'ff-unfulfilled', value: 'unfulfilled', label: 'Unfulfilled' },
  { key: 'ff-processing', value: 'processing', label: 'Processing' },
  { key: 'ff-fulfilled', value: 'fulfilled', label: 'Fulfilled' },
  { key: 'ff-shipped', value: 'shipped', label: 'Shipped' },
  { key: 'ff-delivered', value: 'delivered', label: 'Delivered' },
  { key: 'ff-cancelled', value: 'cancelled', label: 'Cancelled' },
];


export default function OrdersFilters({
  search,
  onSearchChange,
  paymentFilter,
  onPaymentFilterChange,
  fulfillmentFilter,
  onFulfillmentFilterChange,
  affiliateFilter,
  onAffiliateFilterChange,
  onExportCSV,
}: OrdersFiltersProps) {
  const [affiliates, setAffiliates] = useState<Array<{ id: string; name: string; referralCode: string }>>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);

  // Load affiliates from API
  useEffect(() => {
    fetch('/api/affiliates?limit=100')
      .then((res) => res.json())
      .then((data) => {
        if (data.affiliates) {
          setAffiliates(data.affiliates);
        }
      })
      .catch((err) => console.error('Failed to load affiliates:', err))
      .finally(() => setLoadingAffiliates(false));
  }, []);

  const hasActiveFilters = paymentFilter || fulfillmentFilter || affiliateFilter || search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="flex items-center gap-2 h-9 rounded-lg border border-input bg-background px-3 min-w-[220px] flex-1 max-w-sm">
        <Search size={14} className="text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search orders, customers, IDs…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <SlidersHorizontal size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-500">Filter:</span>
      </div>

      {/* Payment filter */}
      <select
        value={paymentFilter}
        onChange={(e) => onPaymentFilterChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus:border-primary transition-colors cursor-pointer"
      >
        {paymentOptions.map((o) => (
          <option key={o.key} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Fulfillment filter */}
      <select
        value={fulfillmentFilter}
        onChange={(e) => onFulfillmentFilterChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus:border-primary transition-colors cursor-pointer"
      >
        {fulfillmentOptions.map((o) => (
          <option key={o.key} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Affiliate filter */}
      <select
        value={affiliateFilter}
        onChange={(e) => onAffiliateFilterChange(e.target.value)}
        disabled={loadingAffiliates}
        className="h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus:border-primary transition-colors cursor-pointer disabled:opacity-50"
      >
        <option value="">All Affiliates</option>
        {affiliates.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.referralCode})
          </option>
        ))}
        <option value="none">No Affiliate</option>
      </select>

      {hasActiveFilters && (
        <button
          onClick={() => {
            onSearchChange('');
            onPaymentFilterChange('');
            onFulfillmentFilterChange('');
            onAffiliateFilterChange('');
          }}
          className="h-9 px-3 rounded-lg border border-border text-xs font-500 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
        >
          <X size={12} /> Clear filters
        </button>
      )}

      <div className="flex-1" />

      {/* Export */}
      <button
        onClick={onExportCSV}
        className="h-9 px-4 rounded-lg border border-border text-sm font-500 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2"
      >
        <Download size={14} />
        Export CSV
      </button>
    </div>
  );
}