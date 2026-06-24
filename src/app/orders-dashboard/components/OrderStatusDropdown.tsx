'use client';

import React, { useState, useRef, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { ChevronDown } from 'lucide-react';

type FulfillmentStatus = 'unfulfilled' | 'processing' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled';

const statusOptions: { key: string; value: FulfillmentStatus; label: string; variant: 'warning' | 'info' | 'success' | 'primary' | 'muted' | 'danger' }[] = [
  { key: 'fs-unfulfilled', value: 'unfulfilled', label: 'Unfulfilled', variant: 'warning' },
  { key: 'fs-processing', value: 'processing', label: 'Processing', variant: 'info' },
  { key: 'fs-fulfilled', value: 'fulfilled', label: 'Fulfilled', variant: 'primary' },
  { key: 'fs-shipped', value: 'shipped', label: 'Shipped', variant: 'success' },
  { key: 'fs-delivered', value: 'delivered', label: 'Delivered', variant: 'success' },
  { key: 'fs-cancelled', value: 'cancelled', label: 'Cancelled', variant: 'muted' },
];

interface Props {
  value: FulfillmentStatus;
  onChange: (v: FulfillmentStatus) => void;
}

export default function OrderStatusDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = statusOptions.find((s) => s.value === value) ?? statusOptions[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 group"
        aria-label="Change fulfillment status"
      >
        <Badge variant={current.variant} dot>
          {current.label}
        </Badge>
        <ChevronDown size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px] fade-in">
          {statusOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${
                opt.value === value ? 'bg-muted/60' : ''
              }`}
            >
              <Badge variant={opt.variant} dot>{opt.label}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}