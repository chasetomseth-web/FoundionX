'use client';

import React from 'react';
import { type StorefrontPage } from './storefrontData';
import { Edit2, ExternalLink, Clock } from 'lucide-react';

interface Props {
  page: StorefrontPage;
}

const typeLabels: Record<string, string> = {
  homepage: 'Homepage',
  product: 'Product',
  collection: 'Collection',
  checkout: 'Checkout',
  landing: 'Landing',
  custom: 'Custom',
};

export default function StorefrontPageRow({ page }: Props) {
  const date = new Date(page.lastModified);
  const formatted = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="px-4 py-3.5 flex items-center gap-4 hover:bg-muted/30 transition-colors group">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${page.status === 'published' ? 'bg-success' : page.status === 'draft' ? 'bg-warning' : 'bg-muted-foreground'}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-500 text-foreground truncate">{page.name}</p>
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-500 uppercase">{typeLabels[page.type]}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground font-mono">{page.slug}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={10} />
            {formatted}
          </span>
          <span className="text-xs text-muted-foreground">{page.htmlSize} KB</span>
        </div>
      </div>

      {/* Metrics */}
      {page.status === 'published' && (
        <div className="hidden md:flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Views</p>
            <p className="text-sm font-500 text-foreground tabular-nums">{page.views.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Conv.</p>
            <p className="text-sm font-500 text-foreground tabular-nums">{page.conversionRate}%</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit">
          <Edit2 size={13} />
        </button>
        <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Preview">
          <ExternalLink size={13} />
        </button>
      </div>
    </div>
  );
}
