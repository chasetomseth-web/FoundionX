/**
 * Customer Portal — Subscriptions (Retention-First Flow)
 * Features: Delay-first approach, retention modal, product swap
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, Loader2, Clock, Package, CreditCard, XCircle, AlertCircle } from 'lucide-react';

interface Subscription {
  id: string;
  planName: string;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  productId: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-red-100 text-red-700',
  trialing: 'bg-blue-100 text-blue-700',
  incomplete: 'bg-orange-100 text-orange-700',
};

export default function PortalSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelayModal, setShowDelayModal] = useState<string | null>(null);
  const [showRetentionModal, setShowRetentionModal] = useState<string | null>(null);
  const [retentionStep, setRetentionStep] = useState(1);
  const [cancelReason, setCancelReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function fetchSubscriptions() {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions?customer=me');
      const json = await res.json();
      setSubscriptions(json.subscriptions ?? []);
    } catch {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }

  function calculateNewDate(currentDate: string, weeks: number) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + (weeks * 7));
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  async function handleDelay(subscriptionId: string, weeks: number) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks }),
      });

      if (res.ok) {
        alert(`Subscription delayed by ${weeks} weeks!`);
        setShowDelayModal(null);
        fetchSubscriptions();
      } else {
        alert('Failed to delay subscription');
      }
    } catch {
      alert('Error delaying subscription');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelStep1(subscriptionId: string) {
    // Show retention modal
    setShowRetentionModal(subscriptionId);
    setRetentionStep(1);
  }

  async function handleDelayFromRetention(subscriptionId: string, weeks: number) {
    await handleDelay(subscriptionId, weeks);
    setShowRetentionModal(null);
  }

  async function proceedToStep2() {
    setProcessing(true);
    const subscriptionId = showRetentionModal!;
    
    try {
      // Call retention API to set flag
      await fetch(`/api/subscriptions/${subscriptionId}/retention`, {
        method: 'POST',
      });
      
      setRetentionStep(2);
    } catch {
      alert('Error processing request');
    } finally {
      setProcessing(false);
    }
  }

  async function handleFinalCancel() {
    if (!cancelReason) {
      alert('Please select a cancellation reason');
      return;
    }

    setProcessing(true);
    const subscriptionId = showRetentionModal!;

    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason, cancelAtPeriodEnd: true }),
      });

      const data = await res.json();

      if (res.ok) {
        const subscription = subscriptions.find(s => s.id === subscriptionId);
        const endDate = subscription?.currentPeriodEnd 
          ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'the end of your billing period';
        
        alert(`Your subscription has been cancelled. Access continues until ${endDate}.`);
        setShowRetentionModal(null);
        setRetentionStep(1);
        setCancelReason('');
        fetchSubscriptions();
      } else {
        alert(data.message || 'Failed to cancel subscription');
      }
    } catch {
      alert('Error cancelling subscription');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-20">
        <Receipt size={40} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500 text-sm">No subscriptions found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your active subscriptions</p>
      </div>

      <div className="grid gap-6">
        {subscriptions.map((sub) => (
          <div key={sub.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            {/* Subscription Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{sub.planName}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[sub.status] || 'bg-gray-100 text-gray-700'}`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ${sub.amount.toFixed(2)}
                  <span className="text-lg font-normal text-gray-500"> / {sub.interval}</span>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Next billing: {new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Action Buttons - Delay First! */}
            {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowDelayModal(sub.id)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Clock size={18} />
                  Delay Next Order
                </button>
                
                <button
                  onClick={() => alert('Swap product feature - integrate with your product catalog')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                >
                  <Package size={18} />
                  Swap Product
                </button>
                
                {sub.stripeSubscriptionId && (
                  <a
                    href={`https://billing.stripe.com/p/login/test_${sub.stripeSubscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                  >
                    <CreditCard size={18} />
                    Update Payment
                  </a>
                )}
                
                <button
                  onClick={() => handleCancelStep1(sub.id)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 font-normal text-sm transition-colors"
                >
                  <XCircle size={16} />
                  Cancel Subscription
                </button>
              </div>
            )}

            {sub.cancelAtPeriodEnd && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <AlertCircle size={16} className="inline mr-2" />
                  This subscription will end on {new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delay Modal */}
      {showDelayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Having too much? Just delay your next order.</h2>
            <p className="text-gray-600 mb-6">Choose how long you'd like to delay:</p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[2, 4, 6].map((weeks) => {
                const subscription = subscriptions.find(s => s.id === showDelayModal);
                const newDate = subscription ? calculateNewDate(subscription.currentPeriodEnd, weeks) : '';
                
                return (
                  <button
                    key={weeks}
                    onClick={() => handleDelay(showDelayModal, weeks)}
                    disabled={processing}
                    className="border-2 border-blue-200 rounded-lg p-6 hover:border-blue-600 hover:bg-blue-50 transition-all text-center disabled:opacity-50"
                  >
                    <div className="text-4xl font-bold text-blue-600 mb-2">{weeks}</div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Weeks</div>
                    <div className="text-xs text-gray-500">New date: {newDate}</div>
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setShowDelayModal(null)}
              disabled={processing}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Nevermind
            </button>
          </div>
        </div>
      )}

      {/* Retention Modal */}
      {showRetentionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8">
            {retentionStep === 1 ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Before you go...</h2>
                
                <div className="space-y-3 mb-6">
                  {[2, 4, 6].map((weeks) => {
                    const subscription = subscriptions.find(s => s.id === showRetentionModal);
                    const newDate = subscription ? calculateNewDate(subscription.currentPeriodEnd, weeks) : '';
                    
                    return (
                      <button
                        key={weeks}
                        onClick={() => handleDelayFromRetention(showRetentionModal, weeks)}
                        disabled={processing}
                        className="w-full border-2 border-blue-200 rounded-lg p-4 hover:border-blue-600 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
                      >
                        <div className="font-semibold text-gray-900">Delay {weeks} weeks</div>
                        <div className="text-sm text-gray-600">Next billing: {newDate}</div>
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => alert('Swap product feature')}
                  className="w-full text-blue-600 hover:text-blue-700 font-medium mb-4"
                >
                  Swap to a different product
                </button>
                
                <button
                  onClick={proceedToStep2}
                  disabled={processing}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  No, I still want to cancel
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Tell us why you're cancelling</h2>
                
                <div className="space-y-3 mb-6">
                  {[
                    'Too much product',
                    'Too expensive',
                    "Didn't see results",
                    'Found better option',
                    'Health issue',
                    'Other'
                  ].map((reason) => (
                    <label key={reason} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
                
                <button
                  onClick={handleFinalCancel}
                  disabled={!cancelReason || processing}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                >
                  {processing ? 'Processing...' : 'Cancel Subscription'}
                </button>
                
                <button
                  onClick={() => {
                    setShowRetentionModal(null);
                    setRetentionStep(1);
                    setCancelReason('');
                  }}
                  disabled={processing}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Keep My Subscription
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
