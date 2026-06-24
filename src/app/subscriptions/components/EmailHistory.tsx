'use client';

import { useState, useEffect } from 'react';

interface EmailHistoryProps {
  subscriptionId: string;
}

export function EmailHistory({ subscriptionId }: EmailHistoryProps) {
  const [emailEvents, setEmailEvents] = useState<any[]>([]);
  const [emailStats, setEmailStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmailHistory();
  }, [subscriptionId]);

  const fetchEmailHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/subscriptions/${subscriptionId}?includeEmailEvents=true&includeEmailStats=true`
      );

      if (!response.ok) throw new Error('Failed to fetch email history');

      const data = await response.json();
      setEmailEvents(data.emailEvents || []);
      setEmailStats(data.emailStats || null);
    } catch (error) {
      console.error('Error fetching email history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      opened: 'bg-purple-100 text-purple-800',
      clicked: 'bg-indigo-100 text-indigo-800',
      bounced: 'bg-red-100 text-red-800',
      failed: 'bg-orange-100 text-orange-800',
      pending: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getEmailTypeLabel = (emailType: string) => {
    return emailType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-100 rounded"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email History</h3>

        {emailStats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{emailStats.total}</div>
              <div className="text-xs text-gray-500">Total Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{emailStats.delivered}</div>
              <div className="text-xs text-gray-500">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {emailStats.openRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Open Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {emailStats.clickRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Click Rate</div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        {emailEvents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p className="text-sm">No emails sent yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {emailEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {getEmailTypeLabel(event.emailType)}
                    </div>
                    {event.subject && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{event.subject}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.recipient}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(event.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(event.sentAt)}</div>
                    {event.openedAt && (
                      <div className="text-xs text-purple-600">Opened: {formatDate(event.openedAt)}</div>
                    )}
                    {event.clickedAt && (
                      <div className="text-xs text-indigo-600">Clicked: {formatDate(event.clickedAt)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {event.errorMessage && (
                      <button
                        className="text-red-600 hover:text-red-700"
                        title={event.errorMessage}
                      >
                        View Error
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
