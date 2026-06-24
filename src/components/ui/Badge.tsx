import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-bg text-success border-success/20',
  warning: 'bg-warning-bg text-warning border-warning/20',
  danger: 'bg-danger-bg text-danger border-danger/20',
  info: 'bg-info-bg text-info border-info/20',
  muted: 'bg-muted text-muted-foreground border-border',
  primary: 'bg-primary/10 text-primary border-primary/20',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-muted-foreground',
  primary: 'bg-primary',
};

export default function Badge({ variant, children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-500 border ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClasses[variant]}`} />}
      {children}
    </span>
  );
}