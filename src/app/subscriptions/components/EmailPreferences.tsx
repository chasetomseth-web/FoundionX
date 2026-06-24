'use client';

import { useState, useEffect } from 'react';

interface EmailPreferencesProps {
  subscriptionId: string;
  currentPreferences?: any;
}

export function EmailPreferences({ subscriptionId, currentPreferences }: EmailPreferencesProps) {
  const [preferences, setPreferences] = useState({
    welcome: true,
    renewalReminder: true,
    paymentFailed: true,
    paymentSuccess: true,
    trialEnding: true,
    cancelled: true,
    paused: true,
    resumed: true,
    ...currentPreferences,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const emailTypes = [
    { key: 'welcome', label: 'Welcome Email', description: 'Sent when subscription starts' },
    { key: 'renewalReminder', label: 'Renewal Reminders', description: 'Notify before billing' },
    { key: 'paymentFailed', label: 'Payment Failed', description: 'Alert on failed payments' },
    { key: 'paymentSuccess', label: 'Payment Success', description: 'Confirm successful payments' },
    { key: 'trialEnding', label: 'Trial Ending', description: 'Reminder when trial ends soon' },
    { key: 'cancelled', label: 'Cancellation', description: 'Confirm when cancelled' },
    { key: 'paused', label: 'Paused', description: 'Confirm when paused' },
    { key: 'resumed', label: 'Resumed', description: 'Confirm when resumed' },
  ];

  const handleToggle = (key: string) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailPreferences: preferences,
        }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Error updating email preferences:', error);
      alert('Failed to update email preferences');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Email Preferences</h3>
          <p className="text-sm text-gray-500 mt-1">Choose which emails you'd like to receive</p>
        </div>
        {isSaved && (
          <span className="text-sm text-green-600 font-medium">✓ Saved</span>
        )}
      </div>

      <div className="space-y-4">
        {emailTypes.map((emailType) => (
          <div key={emailType.key} className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id={emailType.key}
                checked={preferences[emailType.key] ?? true}
                onChange={() => handleToggle(emailType.key)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-3">
              <label
                htmlFor={emailType.key}
                className="font-medium text-gray-900 text-sm cursor-pointer"
              >
                {emailType.label}
              </label>
              <p className="text-xs text-gray-500">{emailType.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
