'use client';

import React from 'react';
import { type Customer } from './customersData';
import { X, CreditCard, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

interface Props {
  customer: Customer;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-success-bg text-success',
  at_risk: 'bg-warning-bg text-warning',
  churned: 'bg-danger-bg text-danger',
  new: 'bg-info-bg text-info',
};

export default function CustomerDetailPanel({ customer, onClose }: Props) {
  const joined = new Date(customer.joinedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lastOrder = new Date(customer.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto slide-in-right scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-600 text-sm">
              {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 className="font-600 text-foreground">{customer.name}</h2>
              <p className="text-xs text-muted-foreground">{customer.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Status + Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-500 ${statusColors[customer.status]}`}>{customer.status.replace('_', ' ')}</span>
            {customer.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-500 bg-muted text-muted-foreground">{tag}</span>
            ))}
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Contact</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                <Mail size={13} className="text-muted-foreground" />
                {customer.email}
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                  <Phone size={13} className="text-muted-foreground" />
                  {customer.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                <MapPin size={13} className="text-muted-foreground" />
                {customer.country}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Orders</p>
              <p className="text-lg font-600 text-foreground">{customer.totalOrders}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">LTV</p>
              <p className="text-lg font-600 text-foreground">${customer.ltv.toFixed(0)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">AOV</p>
              <p className="text-lg font-600 text-foreground">${customer.avgOrderValue.toFixed(0)}</p>
            </div>
          </div>

          {/* Subscription */}
          {customer.hasSubscription && (
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Subscription</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Recurring billing</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-500 ${customer.subscriptionStatus === 'active' ? 'bg-success-bg text-success' : customer.subscriptionStatus === 'past_due' ? 'bg-warning-bg text-warning' : 'bg-muted text-muted-foreground'}`}>
                  {customer.subscriptionStatus}
                </span>
              </div>
            </div>
          )}

          {/* Stripe */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Stripe</p>
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-muted-foreground" />
                <span className="text-xs font-mono text-secondary-foreground">{customer.stripeCustomerId}</span>
              </div>
              <button className="text-xs text-primary hover:opacity-80 transition-opacity flex items-center gap-1">
                View <ExternalLink size={10} />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Timeline</p>
            <div className="flex flex-col gap-1.5 text-xs text-secondary-foreground">
              <div className="flex items-center justify-between">
                <span>Joined</span>
                <span className="text-foreground font-500">{joined}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Order</span>
                <span className="text-foreground font-500">{lastOrder}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Notes</p>
              <p className="text-sm text-secondary-foreground leading-relaxed bg-muted/40 rounded-xl p-3">{customer.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
              Send Email
            </button>
            <button className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
              View Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
