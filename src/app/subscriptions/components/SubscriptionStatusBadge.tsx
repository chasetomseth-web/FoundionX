'use client';

interface SubscriptionStatusBadgeProps {
  status: string;
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trialing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'canceled':
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paused':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'incomplete':
      case 'incomplete_expired':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'unpaid':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '✓';
      case 'trialing':
        return '🎁';
      case 'past_due':
        return '⚠️';
      case 'canceled':
      case 'cancelled':
        return '✕';
      case 'paused':
        return '⏸';
      case 'incomplete':
      case 'incomplete_expired':
        return '⏳';
      case 'unpaid':
        return '❌';
      default:
        return '●';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )}`}
    >
      <span>{getStatusIcon(status)}</span>
      <span>{formatStatus(status)}</span>
    </span>
  );
}
