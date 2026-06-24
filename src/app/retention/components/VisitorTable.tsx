'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useVisitors } from '../hooks/useRetentionData';
import { formatDuration, formatTimestamp } from '@/lib/retention-mock-data';
import type { VisitorListItem } from '@/lib/retention-types';

interface Props {
  onSelectVisitor: (id: string) => void;
  selectedVisitorId: string | null;
}

function StatusBadge({ status }: { status: VisitorListItem['status'] }) {
  const styles: Record<string, string> = {
    anonymous: 'bg-muted text-muted-foreground border-border',
    identified: 'bg-success-bg text-success border-success/20',
    returning: 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-600 border ${styles[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'anonymous'
            ? 'bg-muted-foreground'
            : status === 'identified'
            ? 'bg-success'
            : 'bg-primary'
        }`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function IntentBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-xs text-muted-foreground">—</span>;

  const level = score >= 80 ? 'very-high' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  const levelLabels = { 'very-high': 'Very High', high: 'High', medium: 'Medium', low: 'Low' };
  const levelColors = {
    'very-high': 'bg-success-bg text-success border-success/20',
    high: 'bg-warning-bg text-warning border-warning/20',
    medium: 'bg-primary/10 text-primary border-primary/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${levelColors[level]}`}
    >
      {levelLabels[level]}
    </span>
  );
}

export default function VisitorTable({ onSelectVisitor, selectedVisitorId }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 15;

  const { data, isLoading } = useVisitors(page, limit);

  const filtered = data?.data.filter(
    (v) =>
      !search ||
      v.email?.toLowerCase().includes(search.toLowerCase()) ||
      v.id.toLowerCase().includes(search.toLowerCase()) ||
      v.anonymousId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search visitors by email, ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {data && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Page {page} of {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-600 uppercase tracking-widest text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Visitor</th>
              <th className="text-left px-4 py-3 font-medium">Location</th>
              <th className="text-left px-4 py-3 font-medium">First Seen</th>
              <th className="text-left px-4 py-3 font-medium">Last Seen</th>
              <th className="text-left px-4 py-3 font-medium">Duration</th>
              <th className="text-left px-4 py-3 font-medium">Pages</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Intent</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered && filtered.length > 0 ? (
              filtered.map((visitor) => (
                <tr
                  key={visitor.id}
                  onClick={() => onSelectVisitor(visitor.id)}
                  className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedVisitorId === visitor.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-foreground text-sm font-500 truncate max-w-[220px]">
                    {(() => {
                      const firstName = visitor.firstName?.trim();
                      const lastName = visitor.lastName?.trim();
                      if (firstName || lastName) {
                        return [firstName, lastName].filter(Boolean).join(' ').trim();
                      }
                      if (visitor.email) return visitor.email;
                      return `Anonymous Visitor ${visitor.anonymousId.slice(0, 12)}`;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-foreground text-xs">
                    {visitor.locationCity && visitor.locationCountry ? (
                      <span>
                        {visitor.locationCity}, {visitor.locationCountry}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatTimestamp(visitor.firstSeen)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatTimestamp(visitor.lastSeen)}
                  </td>
                  <td className="px-4 py-3 text-foreground text-xs tabular-nums">
                    {formatDuration(visitor.durationSeconds)}
                  </td>
                  <td className="px-4 py-3 text-foreground text-xs tabular-nums">
                    {visitor.pagesViewed}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={visitor.status} />
                  </td>
                  <td className="px-4 py-3">
                    <IntentBadge score={visitor.intentScore} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No visitors found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filtered?.length ?? 0} of {data.total} visitors
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-2">
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-2 py-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}