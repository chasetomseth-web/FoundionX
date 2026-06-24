import React from 'react';

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} />;
}

export function SkeletonMetricCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonBlock className="h-8 w-32" />
      <SkeletonBlock className="h-3 w-20" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 8 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`skel-col-${i + 1}`} className="px-4 py-3">
          <SkeletonBlock className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}