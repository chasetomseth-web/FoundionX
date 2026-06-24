'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ShoppingCart, Users, Package, Link2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  meta: string;
  url: string;
}

interface SearchResponse {
  allResults: SearchResult[];
  query: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  order: <ShoppingCart size={13} className="text-muted-foreground" />,
  customer: <Users size={13} className="text-muted-foreground" />,
  product: <Package size={13} className="text-muted-foreground" />,
  affiliate: <Link2 size={13} className="text-muted-foreground" />,
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=4`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setResults(data.allResults ?? []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative flex-1 max-w-xs" ref={panelRef}>
      <div className="flex items-center gap-2 h-8 rounded-lg border border-border bg-muted/40 px-3">
        <Search size={13} className="text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search orders, customers…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} className="text-muted-foreground hover:text-foreground">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-10 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-2 items-center">
                  <div className="w-5 h-5 bg-muted rounded" />
                  <div className="flex-1 h-3 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No results for &quot;{query}&quot;</div>
          ) : (
            <div className="py-1">
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="flex-shrink-0">{typeIcons[r.type] ?? <Search size={13} />}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-500 text-foreground truncate">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{r.meta}</span>
                </button>
              ))}
              <div className="border-t border-border px-3 py-2">
                <button
                  onClick={() => { router.push(`/orders-dashboard?search=${encodeURIComponent(query)}`); setIsOpen(false); }}
                  className="flex items-center gap-1 text-xs text-primary font-500 hover:underline"
                >
                  Search all results <ArrowRight size={10} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
