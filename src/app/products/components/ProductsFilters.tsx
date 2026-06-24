'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  typeFilter: string;
  onTypeFilter: (v: string) => void;
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'physical', label: 'Physical' },
  { value: 'digital', label: 'Digital' },
  { value: 'subscription', label: 'Subscription' },
];

export default function ProductsFilters({ search, onSearch, statusFilter, onStatusFilter, typeFilter, onTypeFilter }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 flex-1 min-w-48">
        <Search size={14} className="text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search products, SKUs…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilter(e.target.value)}
        className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
      >
        {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilter(e.target.value)}
        className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
      >
        {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
