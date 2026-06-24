'use client';

import React, { useState } from 'react';
import type { Order } from './ordersData';
import Badge from '@/components/ui/Badge';
import { X, ExternalLink, RefreshCw, Package, Truck, AlertCircle, Copy, Check, Printer, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  order: Order | null;
  onClose: () => void;
}

interface ShippingRate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  deliveryDays: number | null;
}

interface ParcelForm {
  length: string;
  width: string;
  height: string;
  weight: string;
}

interface AddressForm {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const paymentBadgeMap: Record<string, 'success' | 'danger' | 'warning' | 'muted'> = {
  paid: 'success', failed: 'danger', pending: 'warning', refunded: 'muted',
};

const fulfillmentBadgeMap: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'muted' | 'danger'> = {
  fulfilled: 'primary', unfulfilled: 'warning', processing: 'info',
  shipped: 'success', delivered: 'success', cancelled: 'muted',
};

export default function OrderDetailPanel({ order, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [fetchedShipmentId, setFetchedShipmentId] = useState<string>('');
  const [labelUrl, setLabelUrl] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState<string>(order?.trackingNumber ?? '');

  const [parcel, setParcel] = useState<ParcelForm>({ length: '10', width: '8', height: '4', weight: '16' });
  const [toAddress, setToAddress] = useState<AddressForm>({
    name: order?.customer?.name ?? '',
    street1: '', city: '', state: '', zip: '', country: 'US',
  });
  const [fromAddress, setFromAddress] = useState<AddressForm>({
    name: 'My Store',
    street1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  // Load from-address from store settings on mount
  React.useEffect(() => {
    fetch('/api/store/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.store) {
          setFromAddress({
            name: d.store.fromAddressName ?? 'My Store',
            street1: d.store.fromAddressStreet ?? '',
            city: d.store.fromAddressCity ?? '',
            state: d.store.fromAddressState ?? '',
            zip: d.store.fromAddressZip ?? '',
            country: d.store.fromAddressCountry ?? 'US',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetryPayment = () => {
    toast.success('Payment retry queued — Stripe will attempt in 30 seconds');
  };

  const handleIssueRefund = () => {
    toast.success(`Refund initiated for ${order?.orderNumber}`);
  };

  const handleGetRates = async () => {
    setLoadingRates(true);
    setRates([]);
    setSelectedRateId('');
    setFetchedShipmentId('');
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAddress,
          fromAddress,
          parcel: {
            length: parseFloat(parcel.length),
            width: parseFloat(parcel.width),
            height: parseFloat(parcel.height),
            weight: parseFloat(parcel.weight),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to get rates');
      setRates(data.rates ?? []);
      setFetchedShipmentId(data.shipmentId ?? '');
      if (data.rates?.length > 0) {
        // Auto-select cheapest
        const cheapest = [...data.rates].sort((a: ShippingRate, b: ShippingRate) => a.rate - b.rate)[0];
        setSelectedRateId(cheapest.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get shipping rates');
    } finally {
      setLoadingRates(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!selectedRateId || !order) return;
    setCreatingLabel(true);
    try {
      const res = await fetch('/api/shipping/create-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          toAddress,
          fromAddress,
          parcel: {
            length: parseFloat(parcel.length),
            width: parseFloat(parcel.width),
            height: parseFloat(parcel.height),
            weight: parseFloat(parcel.weight),
          },
          rateId: selectedRateId,
          shipmentId: fetchedShipmentId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create label');
      setLabelUrl(data.labelUrl ?? '');
      setTrackingCode(data.trackingCode ?? '');
      toast.success(`Label created! Tracking: ${data.trackingCode}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create label');
    } finally {
      setCreatingLabel(false);
    }
  };

  const handlePrintLabel = () => {
    if (!labelUrl) return;
    window.open(labelUrl, '_blank');
  };

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const canCreateLabel =
    order.paymentStatus === 'paid' &&
    !['shipped', 'delivered'].includes(order.fulfillmentStatus) &&
    !labelUrl &&
    !order.trackingNumber;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-600 text-foreground">{order.orderNumber}</h3>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 flex flex-col gap-5">
          {/* Status row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={paymentBadgeMap[order.paymentStatus]} dot>{order.paymentStatus}</Badge>
            <Badge variant={fulfillmentBadgeMap[order.fulfillmentStatus]} dot>{order.fulfillmentStatus}</Badge>
            {order.subscriptionOrder && <Badge variant="primary">Subscription</Badge>}
          </div>

          {/* Customer */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
            <p className="text-sm font-600 text-foreground">{order.customer.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{order.customer.email}</p>
          </div>

          {/* Products */}
          <div>
            <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground mb-2">Products</p>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-foreground">{order.products}</p>
              <p className="text-xs text-muted-foreground mt-1">{order.items} item{order.items !== 1 ? 's' : ''}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Order total</span>
                <span className="text-sm font-700 text-foreground tabular-nums">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Stripe */}
          <div>
            <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground mb-2">Stripe Transaction</p>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-500 text-foreground tabular-nums truncate">{order.stripeTransactionId}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleCopy(order.stripeTransactionId)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-border transition-colors text-muted-foreground">
                    {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  </button>
                  <a href={`https://dashboard.stripe.com/payments/${order.stripeTransactionId}`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded flex items-center justify-center hover:bg-border transition-colors text-muted-foreground">
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Payment status: <span className="font-600">{order.paymentStatus}</span></p>
            </div>
          </div>

          {/* Affiliate */}
          {order.affiliate && (
            <div>
              <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground mb-2">Affiliate Attribution</p>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs font-500 text-foreground tabular-nums">{order.affiliate}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Commission pending payout via GoAffPro</p>
              </div>
            </div>
          )}

          {/* Shipping info (existing) */}
          {(order.carrier || order.trackingNumber || trackingCode) && (
            <div>
              <p className="text-xs font-600 uppercase tracking-wider text-muted-foreground mb-2">Shipping</p>
              <div className="bg-muted/50 rounded-xl p-4 flex flex-col gap-1.5">
                {order.carrier && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Carrier</span>
                    <span className="font-500 text-foreground">{order.carrier}</span>
                  </div>
                )}
                {(order.trackingNumber || trackingCode) && (
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="text-muted-foreground flex-shrink-0">Tracking</span>
                    <div className="flex items-center gap-1">
                      <span className="font-500 text-foreground tabular-nums text-xs">{order.trackingNumber || trackingCode}</span>
                      <a
                        href={`/track/${order.trackingNumber || trackingCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-border transition-colors text-muted-foreground"
                      >
                        <MapPin size={11} />
                      </a>
                    </div>
                  </div>
                )}
                {labelUrl && (
                  <button
                    onClick={handlePrintLabel}
                    className="flex items-center justify-center gap-2 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-600 hover:bg-primary/90 active:scale-[0.98] transition-all mt-2"
                  >
                    <Printer size={12} />
                    Print Label
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Create Label Section */}
          {canCreateLabel && (
            <div>
              <button
                onClick={() => setShowLabelForm(!showLabelForm)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-sm font-600 text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Package size={15} />
                  Create Shipping Label (Shippo)
                </div>
                {showLabelForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showLabelForm && (
                <div className="mt-3 bg-muted/30 rounded-xl border border-border p-4 flex flex-col gap-4">
                  {/* To Address */}
                  <div>
                    <p className="text-xs font-600 text-muted-foreground mb-2 uppercase tracking-wider">Ship To</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <input
                          className="w-full h-8 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Full name"
                          value={toAddress.name}
                          onChange={(e) => setToAddress({ ...toAddress, name: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          className="w-full h-8 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Street address"
                          value={toAddress.street1}
                          onChange={(e) => setToAddress({ ...toAddress, street1: e.target.value })}
                        />
                      </div>
                      <input
                        className="h-8 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="City"
                        value={toAddress.city}
                        onChange={(e) => setToAddress({ ...toAddress, city: e.target.value })}
                      />
                      <input
                        className="h-8 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="State (e.g. CA)"
                        value={toAddress.state}
                        onChange={(e) => setToAddress({ ...toAddress, state: e.target.value })}
                      />
                      <input
                        className="h-8 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="ZIP code"
                        value={toAddress.zip}
                        onChange={(e) => setToAddress({ ...toAddress, zip: e.target.value })}
                      />
                      <input
                        className="h-8 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Country (US)"
                        value={toAddress.country}
                        onChange={(e) => setToAddress({ ...toAddress, country: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Parcel */}
                  <div>
                    <p className="text-xs font-600 text-muted-foreground mb-2 uppercase tracking-wider">Package (inches / oz)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(['length', 'width', 'height', 'weight'] as const).map((field) => (
                        <div key={field}>
                          <p className="text-[10px] text-muted-foreground mb-1 capitalize">{field}</p>
                          <input
                            type="number"
                            className="w-full h-8 px-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            value={parcel[field]}
                            onChange={(e) => setParcel({ ...parcel, [field]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Get Rates */}
                  <button
                    onClick={handleGetRates}
                    disabled={loadingRates || !toAddress.street1 || !toAddress.city}
                    className="flex items-center justify-center gap-2 h-9 rounded-lg border border-border text-sm font-600 text-foreground hover:bg-muted active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loadingRates ? <RefreshCw size={13} className="animate-spin" /> : <Truck size={13} />}
                    {loadingRates ? 'Getting Rates…' : 'Get Shipping Rates'}
                  </button>

                  {/* Rate Selection */}
                  {rates.length > 0 && (
                    <div>
                      <p className="text-xs font-600 text-muted-foreground mb-2 uppercase tracking-wider">Select Rate</p>
                      <div className="flex flex-col gap-1.5">
                        {[...rates].sort((a, b) => a.rate - b.rate).map((rate) => (
                          <button
                            key={rate.id}
                            onClick={() => setSelectedRateId(rate.id)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                              selectedRateId === rate.id
                                ? 'border-primary bg-primary/5 text-foreground'
                                : 'border-border hover:bg-muted text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${selectedRateId === rate.id ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                              <span className="font-500">{rate.carrier}</span>
                              <span className="text-muted-foreground text-xs">{rate.service}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-700">${rate.rate.toFixed(2)}</span>
                              {rate.deliveryDays && (
                                <span className="text-[10px] text-muted-foreground ml-1">{rate.deliveryDays}d</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleCreateLabel}
                        disabled={creatingLabel || !selectedRateId}
                        className="mt-3 w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-foreground text-background text-sm font-600 hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {creatingLabel ? <RefreshCw size={13} className="animate-spin" /> : <Package size={13} />}
                        {creatingLabel ? 'Creating Label…' : 'Buy Label & Create Shipment'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Print label if already created */}
          {labelUrl && !canCreateLabel && (
            <button
              onClick={handlePrintLabel}
              className="flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-600 hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <Printer size={14} />
              Print Shipping Label
            </button>
          )}
        </div>

        {/* Actions footer */}
        <div className="border-t border-border p-4 flex flex-col gap-2">
          {order.paymentStatus === 'failed' && (
            <button onClick={handleRetryPayment} className="flex items-center justify-center gap-2 h-9 rounded-lg bg-warning-bg border border-warning/30 text-warning text-sm font-600 hover:bg-warning/20 active:scale-[0.98] transition-all">
              <RefreshCw size={14} />
              Retry Payment
            </button>
          )}
          {order.fulfillmentStatus === 'shipped' && (
            <button
              onClick={() => toast.info('Tracking update sent to customer via Brevo')}
              className="flex items-center justify-center gap-2 h-9 rounded-lg border border-border text-sm font-500 text-foreground hover:bg-muted active:scale-[0.98] transition-all"
            >
              <Truck size={14} />
              Send Tracking Update
            </button>
          )}
          {order.paymentStatus === 'paid' && (
            <button onClick={handleIssueRefund} className="flex items-center justify-center gap-2 h-9 rounded-lg border border-danger/30 bg-danger-bg text-danger text-sm font-500 hover:bg-danger/20 active:scale-[0.98] transition-all">
              <AlertCircle size={14} />
              Issue Refund
            </button>
          )}
        </div>
      </div>
    </>
  );
}