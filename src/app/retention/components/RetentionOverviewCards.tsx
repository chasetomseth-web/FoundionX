'use client';

import React from 'react';
import { Users, UserCheck, Clock, Repeat2, Mail, Target, BarChart3 } from 'lucide-react';
import { useRetentionOverview } from '../hooks/useRetentionData';
import { formatDuration } from '@/lib/retention-mock-data';

interface CardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  variant?: 'default' | 'alert' | 'warning' | 'success';
}

function MetricCard({ label, value, subValue, icon: Icon, variant = 'default' }: CardProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card border-border',
    alert: 'bg-danger-bg border-danger/30',
    warning: 'bg-warning-bg border-warning/30',
    success: 'bg-success-bg border-success/30',
  };

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-3 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={16} className="text-primary" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-700 text-foreground tabular-nums leading-none">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

export default function RetentionOverviewCards() {
  const { data, isLoading } = useRetentionOverview();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
            <div className="h-3 w-20 bg-muted rounded mb-4" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const getInterestLevel = (score: number | null): string => {
    if (!score) return 'new';
    if (score >= 80) return 'high-intent';
    if (score >= 60) return 'medium-intent';
    return 'low-intent';
  };

  const cards: CardProps[] = [
    {
      label: 'Total Visitors',
      value: data.totalVisitors.toLocaleString(),
      subValue: `${data.totalSessions} total sessions`,
      icon: Users,
    },
    {
      label: 'Identified',
      value: data.identifiedVisitors.toLocaleString(),
      subValue: `${Math.round((data.identifiedVisitors / data.totalVisitors) * 100)}% of visitors`,
      icon: UserCheck,
      variant: 'success',
    },
    {
      label: 'Avg Time on Site',
      value: formatDuration(data.avgDurationSeconds),
      subValue: 'per session',
      icon: Clock,
    },
    {
      label: 'Returning',
      value: data.returningVisitors.toLocaleString(),
      subValue: `${Math.round((data.returningVisitors / data.totalVisitors) * 100)}% of visitors`,
      icon: Repeat2,
    },
    {
      label: 'Email Capture',
      value: `${data.emailCaptureRate}%`,
      subValue: 'of all visitors',
      icon: Mail,
      variant: 'warning',
    },
    {
      label: 'High Intent',
      value: data.highIntentVisitors.toLocaleString(),
      subValue: 'score >= 80',
      icon: Target,
      variant: 'alert',
    },
    {
      label: 'Total Sessions',
      value: data.totalSessions.toLocaleString(),
      subValue: `${data.avgSessionsPerVisitor.toFixed(1)} avg/visitor`,
      icon: BarChart3,
    },
    {
      label: 'Top Source',
      value: data.topTrafficSource?.source ?? '—',
      subValue: data.topTrafficSource
        ? `${data.topTrafficSource.count} sessions`
        : 'no data',
      icon: BarChart3,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}