'use client';

import React from 'react';
import { type Product } from './productsData';
import { Tag, Zap, ShoppingBag } from 'lucide-react';

interface Props {
  products: Product[];
  onSelect: (p: Product) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-success-bg text-success',
  draft: 'bg-warning-bg text-warning',
  archived: 'bg-muted text-muted-foreground',
};

const typeColors: Record<string, string> = {
  physical: 'bg-info-bg text-info',
  digital: 'bg-primary/10 text-primary',
  subscription: 'bg-warning-bg text-warning',
};

export default function ProductsTable({ products, onSelect }: Props) {
  if (products.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-sm">No products match your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Product</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">SKU</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Type</th>
              <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Price</th>
              <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Inventory</th>
              <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Sales</th>
              <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Revenue</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Features</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelect(p)}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {p.images[0] && (
                        <img src={p.images[0]} alt={`${p.name} product thumbnail`} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="font-500 text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${typeColors[p.type]}`}>
                    {p.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className="font-500 text-foreground">${p.price.toFixed(2)}</span>
                  {p.compareAtPrice && (
                    <span className="ml-1.5 text-xs text-muted-foreground line-through">${p.compareAtPrice.toFixed(2)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.type === 'subscription' || p.type === 'digital' ? (
                    <span className="text-muted-foreground text-xs">∞</span>
                  ) : p.inventory === 0 ? (
                    <span className="text-destructive font-500 text-xs">Out of stock</span>
                  ) : (
                    <span className={p.inventory < 10 ? 'text-warning font-500' : 'text-foreground'}>{p.inventory}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{p.sales}</td>
                <td className="px-4 py-3 text-right tabular-nums font-500 text-foreground">
                  ${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${statusColors[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {p.hasUpsell && (
                      <span title="Has 1-click upsell" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-600">
                        <Zap size={9} />UP
                      </span>
                    )}
                    {p.hasOrderBump && (
                      <span title="Has order bump" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success-bg text-success text-[10px] font-600">
                        <ShoppingBag size={9} />OB
                      </span>
                    )}
                    {p.tags.includes('bestseller') && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning-bg text-warning text-[10px] font-600">
                        <Tag size={9} />BEST
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
