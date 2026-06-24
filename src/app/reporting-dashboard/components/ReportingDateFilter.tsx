'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRange {
  from?: string;
  to?: string;
  label: string;
}

function buildRange(key: string): DateRange {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  switch (key) {
    case '7d':
      return { from: daysAgo(7), to: today, label: 'Last 7 days' };
    case '30d':
      return { from: daysAgo(30), to: today, label: 'Last 30 days' };
    case '90d':
      return { from: daysAgo(90), to: today, label: 'Last 90 days' };
    case 'mtd': {
      const mtd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { from: mtd, to: today, label: 'Month to date' };
    }
    case 'ytd': {
      const ytd = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      return { from: ytd, to: today, label: 'Year to date' };
    }
    default:
      return { label: 'Last 30 days', from: daysAgo(30), to: today };
  }
}

const RANGES = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'mtd', label: 'Month to date' },
  { key: 'ytd', label: 'Year to date' },
];

interface Props {
  onChange?: (from?: string, to?: string) => void;
}

export default function ReportingDateFilter({ onChange }: Props) {
  const [selected, setSelected] = useState('30d');
  const [open, setOpen] = useState(false);

  const current = RANGES.find((r) => r.key === selected) ?? RANGES[1];

  const select = (key: string) => {
    setSelected(key);
    setOpen(false);
    const range = buildRange(key);
    onChange?.(range.from, range.to);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-500 text-foreground hover:bg-muted transition-colors"
      >
        <Calendar size={14} className="text-muted-foreground" />
        {current.label}
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => select(r.key)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  selected === r.key
                    ? 'bg-primary/10 text-primary font-600'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

