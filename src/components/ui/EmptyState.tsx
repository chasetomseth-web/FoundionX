import React from 'react';
import Icon from '@/components/ui/AppIcon';


interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Icon size={24} className="text-muted-foreground" />
      </div>
      <h3 className="text-base font-600 text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-500 hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}