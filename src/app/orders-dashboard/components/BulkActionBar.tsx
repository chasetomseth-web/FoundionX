'use client';

import React from 'react';
import { CheckCircle2, Truck, RefreshCw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  selectedCount: number;
  onClear: () => void;
}

export default function BulkActionBar({ selectedCount, onClear }: Props) {
  if (selectedCount === 0) return null;

  const handleBulkFulfill = () => {
    // BACKEND INTEGRATION: PATCH /api/orders/bulk — update fulfillment status for multiple orders
    toast.success(`${selectedCount} order${selectedCount > 1 ? 's' : ''} marked as fulfilled`);
    onClear();
  };

  const handleBulkShipNotify = () => {
    // BACKEND INTEGRATION: POST /api/notifications/bulk-ship — send shipping notifications via Brevo
    toast.success(`Shipping notifications sent to ${selectedCount} customer${selectedCount > 1 ? 's' : ''}`);
    onClear();
  };

  const handleBulkRetry = () => {
    // BACKEND INTEGRATION: POST /api/stripe/bulk-retry — queue payment retries for failed orders
    toast.success(`Payment retry queued for ${selectedCount} order${selectedCount > 1 ? 's' : ''}`);
    onClear();
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 slide-up">
      <div className="flex items-center gap-2 bg-foreground text-background rounded-xl px-4 py-3 shadow-2xl border border-white/10">
        <span className="text-sm font-600 mr-2">{selectedCount} selected</span>

        <button
          onClick={handleBulkFulfill}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-500 transition-colors active:scale-95"
        >
          <CheckCircle2 size={14} />
          Mark Fulfilled
        </button>

        <button
          onClick={handleBulkShipNotify}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-500 transition-colors active:scale-95"
        >
          <Truck size={14} />
          Notify Shipped
        </button>

        <button
          onClick={handleBulkRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-500 transition-colors active:scale-95"
        >
          <RefreshCw size={14} />
          Retry Payments
        </button>

        <button
          onClick={() => { toast.error('Delete requires individual confirmation for each order'); onClear(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/20 hover:bg-danger/30 text-danger text-sm font-500 transition-colors active:scale-95"
        >
          <Trash2 size={14} />
          Cancel
        </button>

        <button
          onClick={onClear}
          className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Dismiss bulk action bar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}