'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const pageSizeOptions = [
  { key: 'ps-10', value: 10 },
  { key: 'ps-25', value: 25 },
  { key: 'ps-50', value: 50 },
  { key: 'ps-100', value: 100 },
];

export default function OrdersPagination({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }: Props) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Showing</span>
        <span className="font-500 text-foreground tabular-nums">{start}–{end}</span>
        <span>of</span>
        <span className="font-500 text-foreground tabular-nums">{totalItems}</span>
        <span>orders</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus:border-primary transition-colors cursor-pointer"
          >
            {pageSizeOptions.map((o) => (
              <option key={o.key} value={o.value}>{o.value}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>

          {visiblePages.map((page, idx) => {
            const prevPage = visiblePages[idx - 1];
            const showEllipsis = prevPage !== undefined && page - prevPage > 1;
            return (
              <React.Fragment key={`page-${page}`}>
                {showEllipsis && (
                  <span className="w-8 h-8 flex items-center justify-center text-sm text-muted-foreground">…</span>
                )}
                <button
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 rounded-lg border text-sm font-500 transition-colors ${
                    currentPage === page
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              </React.Fragment>
            );
          })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}