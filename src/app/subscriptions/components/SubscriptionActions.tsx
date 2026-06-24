'use client';

import { useState } from 'react';

interface SubscriptionActionsProps {
  subscription: any;
  onUpdate?: () => void;
}

export function SubscriptionActions({ subscription, onUpdate }: SubscriptionActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handlePause = async () => {
    if (!confirm('Are you sure you want to pause this subscription?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/pause`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to pause subscription');

      alert('Subscription paused successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error pausing subscription:', error);
      alert('Failed to pause subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    if (!confirm('Are you sure you want to resume this subscription?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/resume`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to resume subscription');

      alert('Subscription resumed successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error resuming subscription:', error);
      alert('Failed to resume subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (cancelAtPeriodEnd: boolean = true) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          cancelAtPeriodEnd,
        }),
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');

      const data = await response.json();
      alert(data.message || 'Subscription cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');
      onUpdate?.();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const canPause = subscription.status === 'active' && !subscription.pausedAt;
  const canResume = subscription.status === 'paused';
  const canCancel = subscription.status === 'active' && !subscription.cancelAtPeriodEnd;

  return (
    <>
      <div className="flex items-center gap-2">
        {canPause && (
          <button
            onClick={handlePause}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Pause
          </button>
        )}

        {canResume && (
          <button
            onClick={handleResume}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Resume
          </button>
        )}

        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Subscription</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Help us improve by telling us why..."
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                The subscription will remain active until the end of the current billing period (
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCancel(true)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Cancel at Period End'}
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep Subscription
              </button>
            </div>

            <button
              onClick={() => handleCancel(false)}
              disabled={isLoading}
              className="w-full mt-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Immediately
            </button>
          </div>
        </div>
      )}
    </>
  );
}
