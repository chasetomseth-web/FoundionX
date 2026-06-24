'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package, Truck, CheckCircle2, Clock, MapPin, ArrowLeft, RefreshCw, AlertCircle
} from 'lucide-react';

interface TrackingDetail {
  status: string;
  message: string | null;
  datetime: string;
  location: string | null;
}

interface TrackingData {
  trackingCode: string;
  carrier: string | null;
  status: string;
  trackingUrl: string | null;
  estDeliveryDate: string | null;
  order: {
    orderNumber: string;
    createdAt: string;
    customerName: string | null;
  } | null;
  trackingDetails: TrackingDetail[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pre_transit: { label: 'Label Created', color: 'text-muted-foreground', icon: Package },
  label_created: { label: 'Label Created', color: 'text-muted-foreground', icon: Package },
  in_transit: { label: 'In Transit', color: 'text-blue-600', icon: Truck },
  shipped: { label: 'Shipped', color: 'text-blue-600', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-amber-600', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-green-600', icon: CheckCircle2 },
  return_to_sender: { label: 'Return to Sender', color: 'text-red-600', icon: AlertCircle },
  failure: { label: 'Delivery Failed', color: 'text-red-600', icon: AlertCircle },
  unknown: { label: 'Tracking Pending', color: 'text-muted-foreground', icon: Clock },
};

const STATUS_ORDER = ['label_created', 'in_transit', 'out_for_delivery', 'delivered'];

function getStatusStep(status: string): number {
  const normalized = status === 'pre_transit' ? 'label_created' : status === 'shipped' ? 'in_transit' : status;
  return STATUS_ORDER.indexOf(normalized);
}

export default function TrackingPage() {
  const params = useParams();
  const code = params?.code as string;

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shipping/track/${encodeURIComponent(code)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load tracking');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const statusConfig = data ? (STATUS_CONFIG[data.status] ?? STATUS_CONFIG.unknown) : STATUS_CONFIG.unknown;
  const StatusIcon = statusConfig.icon;
  const currentStep = data ? getStatusStep(data.status) : -1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} />
            Back to Store
          </Link>
          <h1 className="text-base font-700 text-foreground">Package Tracking</h1>
          <button
            onClick={fetchTracking}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">

          {/* Tracking code header */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tracking Number</p>
            <p className="text-xl font-700 text-foreground tabular-nums">{code}</p>
          </div>

          {loading && (
            <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading tracking information…</p>
            </div>
          )}

          {error && (
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={24} className="text-danger" />
              <p className="text-sm font-600 text-foreground">Unable to load tracking</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <button
                onClick={fetchTracking}
                className="mt-2 h-9 px-4 rounded-lg bg-foreground text-background text-sm font-600 hover:bg-foreground/90 transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Status card */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-muted ${statusConfig.color}`}>
                    <StatusIcon size={22} />
                  </div>
                  <div>
                    <p className={`text-lg font-700 ${statusConfig.color}`}>{statusConfig.label}</p>
                    {data.carrier && (
                      <p className="text-sm text-muted-foreground">via {data.carrier}</p>
                    )}
                    {data.estDeliveryDate && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Est. delivery: {new Date(data.estDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between relative">
                    {STATUS_ORDER.map((step, idx) => {
                      const cfg = STATUS_CONFIG[step];
                      const StepIcon = cfg.icon;
                      const isCompleted = currentStep > idx;
                      const isCurrent = currentStep === idx;
                      return (
                        <React.Fragment key={step}>
                          <div className="flex flex-col items-center gap-1.5 z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                              isCompleted
                                ? 'bg-green-600 border-green-600 text-white'
                                : isCurrent
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-card border-border text-muted-foreground'
                            }`}>
                              <StepIcon size={14} />
                            </div>
                            <p className={`text-[10px] font-500 text-center max-w-[60px] leading-tight ${
                              isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                            }`}>{cfg.label}</p>
                          </div>
                          {idx < STATUS_ORDER.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 mb-5 ${isCompleted ? 'bg-green-600' : 'bg-border'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order info */}
              {data.order && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground mb-3">Order Information</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Order Number</span>
                      <span className="font-600 text-foreground">{data.order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Order Date</span>
                      <span className="font-500 text-foreground">
                        {new Date(data.order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {data.order.customerName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Customer</span>
                        <span className="font-500 text-foreground">{data.order.customerName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tracking timeline */}
              {data.trackingDetails.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground mb-4">Tracking History</p>
                  <div className="flex flex-col gap-0">
                    {[...data.trackingDetails].reverse().map((detail, idx) => {
                      const cfg = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.unknown;
                      const DetailIcon = cfg.icon;
                      const isFirst = idx === 0;
                      return (
                        <div key={idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isFirst ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              <DetailIcon size={12} />
                            </div>
                            {idx < data.trackingDetails.length - 1 && (
                              <div className="w-px flex-1 bg-border my-1" />
                            )}
                          </div>
                          <div className="pb-4 flex-1 min-w-0">
                            <p className={`text-sm font-600 ${isFirst ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {detail.message ?? cfg.label}
                            </p>
                            {detail.location && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="text-muted-foreground flex-shrink-0" />
                                <p className="text-xs text-muted-foreground">{detail.location}</p>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(detail.datetime).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* External tracking link */}
              {data.trackingUrl && (
                <a
                  href={data.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm font-600 text-foreground hover:bg-muted transition-all"
                >
                  <Truck size={14} />
                  View on {data.carrier ?? 'Carrier'} Website
                </a>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
