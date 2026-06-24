'use client';

import { useState } from 'react';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
import { SubscriptionActions } from './SubscriptionActions';

interface SubscriptionCardProps {
  subscription: any;
  onUpdate?: () => void;
}

export function SubscriptionCard({ subscription, onUpdate }: SubscriptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number | string, currency: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(numAmount);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">{subscription.planName}</h3>
              <SubscriptionStatusBadge status={subscription.status} />
            </div>
            <p className="text-sm text-gray-500">ID: {subscription.id}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatAmount(subscription.amount, subscription.currency)}
            </div>
            <div className="text-sm text-gray-500">
              per {subscription.interval}
              {subscription.intervalCount > 1 && ` (every ${subscription.intervalCount} ${subscription.interval}s)`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Period</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Next Billing</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(subscription.nextBillingAt)}</p>
          </div>
        </div>

        {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Trial Active:</span> Ends on {formatDate(subscription.trialEnd)}
            </p>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
            <p className="text-sm text-orange-800">
              <span className="font-semibold">Cancellation Scheduled:</span> Will end on{' '}
              {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        )}

        {subscription.failedPaymentCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Payment Issues:</span> {subscription.failedPaymentCount} failed attempt
              {subscription.failedPaymentCount > 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
          <SubscriptionActions subscription={subscription} onUpdate={onUpdate} />
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Customer</p>
                <p className="text-sm font-medium text-gray-900">{subscription.customer?.name || 'N/A'}</p>
                <p className="text-xs text-gray-500">{subscription.customer?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Stripe Subscription ID</p>
                <p className="text-sm font-mono text-gray-900 truncate">{subscription.stripeSubscriptionId || 'N/A'}</p>
              </div>
              {subscription.pausedAt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Paused At</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(subscription.pausedAt)}</p>
                </div>
              )}
              {subscription.cancelledAt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cancelled At</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(subscription.cancelledAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
