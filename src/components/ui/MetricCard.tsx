import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'alert' | 'warning' | 'success';
  className?: string;
}

export default function MetricCard({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  icon: Icon,
  variant = 'default',
  className = '',
}: MetricCardProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card border-border',
    alert: 'bg-danger-bg border-danger/30',
    warning: 'bg-warning-bg border-warning/30',
    success: 'bg-success-bg border-success/30',
  };

  const trendColor =
    trend === undefined ? '' : trend > 0 ? 'text-success' : trend < 0 ? 'text-danger' : 'text-muted-foreground';

  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-3 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon size={16} className="text-primary" />
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-700 text-foreground tabular-nums leading-none">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
      </div>
      {(TrendIcon || trendLabel) && (
        <div className={`flex items-center gap-1 text-xs font-500 ${trendColor}`}>
          {TrendIcon && <TrendIcon size={12} />}
          {trend !== undefined && <span>{Math.abs(trend)}%</span>}
          {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}