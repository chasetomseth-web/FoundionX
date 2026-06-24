'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Eye, Code, Check, ChevronDown, ChevronRight, Copy, CheckCircle2 } from 'lucide-react';

interface PageEditorProps {
  page: {
    id: string;
    name: string;
    slug: string;
    type: string;
    html: string;
    css?: string | null;
    isPublished: boolean;
    status: string;
    isCore: boolean;
  };
  onBack: () => void;
  onSaved: () => void;
}

// ============================================================
// ALL AVAILABLE VARIABLES REFERENCE
// ============================================================

interface VariableInfo {
  name: string;
  description: string;
}

const VARIABLE_GROUPS: Array<{
  group: string;
  variables: VariableInfo[];
}> = [
  {
    group: 'Site',
    variables: [
      { name: 'site.name', description: 'Store name' },
      { name: 'site.phone', description: 'Store phone number' },
      { name: 'site.email', description: 'Store email address' },
      { name: 'site.address', description: 'Store physical address' },
      { name: 'site.logo', description: 'Store logo URL' },
      { name: 'site.support_email', description: 'Support email address' },
      { name: 'site.facebook', description: 'Facebook page URL' },
      { name: 'site.instagram', description: 'Instagram profile URL' },
      { name: 'site.youtube', description: 'YouTube channel URL' },
      { name: 'site.tiktok', description: 'TikTok profile URL' },
    ],
  },
  {
    group: 'Product',
    variables: [
      { name: 'product.name', description: 'Product name' },
      { name: 'product.price', description: 'Product price (raw number)' },
      { name: 'product.price | currency', description: 'Product price formatted as currency' },
      { name: 'product.description', description: 'Product description' },
      { name: 'product.image', description: 'Product main image URL' },
      { name: 'product.images[0]', description: 'First product image URL' },
      { name: 'product.sku', description: 'Product SKU' },
      { name: 'product.inventory', description: 'Product inventory count' },
    ],
  },
  {
    group: 'Funnel / Navigation',
    variables: [
      { name: 'next_url', description: 'Next step URL in funnel' },
      { name: 'decline_url', description: 'Decline/No thanks URL' },
      { name: 'checkout_url', description: 'Checkout page URL' },
      { name: 'funnel.name', description: 'Funnel name' },
      { name: 'funnel.step_order', description: 'Current step number' },
      { name: 'funnel.total_steps', description: 'Total steps in funnel' },
    ],
  },
  {
    group: 'Cart',
    variables: [
      { name: 'cart.total', description: 'Cart total' },
      { name: 'cart.total | currency', description: 'Cart total formatted as currency' },
      { name: 'cart.subtotal', description: 'Cart subtotal' },
      { name: 'cart.items', description: 'Cart items count' },
      { name: 'cart.itemCount', description: 'Number of items in cart' },
    ],
  },
  {
    group: 'Customer',
    variables: [
      { name: 'customer.name', description: 'Customer full name' },
      { name: 'customer.first_name', description: 'Customer first name' },
      { name: 'customer.email', description: 'Customer email' },
    ],
  },
  {
    group: 'Order',
    variables: [
      { name: 'order.total', description: 'Order total' },
      { name: 'order.total | currency', description: 'Order total formatted as currency' },
      { name: 'order.number', description: 'Order number' },
      { name: 'order.date', description: 'Order date' },
      { name: 'order.status', description: 'Order status' },
    ],
  },
  {
    group: 'Components',
    variables: [
      { name: 'component.header', description: 'Header component HTML' },
      { name: 'component.footer', description: 'Footer component HTML' },
      { name: 'component.cart-flyout', description: 'Cart flyout component HTML' },
      { name: 'component.announcement', description: 'Announcement bar component HTML' },
    ],
  },
  {
    group: 'Custom Variables',
    variables: [
      { name: 'variable.guarantee_length', description: 'Custom: guarantee length text' },
      { name: 'variable.shipping_time', description: 'Custom: shipping time text' },
      { name: 'variable.promo_code', description: 'Custom: promo/discount code' },
      { name: 'variable.support_hours', description: 'Custom: support hours text' },
      { name: 'variable.*', description: 'Any user-created custom variable' },
    ],
  },
  {
    group: 'Loops & Conditionals',
    variables: [
      { name: '#each products ... {{/each}}', description: 'Loop through products' },
      { name: '#if customer.name ... {{/if}}', description: 'Conditional block' },
      { name: '#if customer.name ... {{else}} ... {{/if}}', description: 'Conditional with else' },
    ],
  },
];

// ============================================================
// PAGE EDITOR COMPONENT
// ============================================================

export default function PageEditor({ page, onBack, onSaved }: PageEditorProps) {
  const [html, setHtml] = useState(page.html || '');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(page.html || '');
  const [showVars, setShowVars] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (content: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pagebuilder/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: content }),
      });
      if (res.ok) {
        setLastSaved('Saved just now');
        onSaved();
      }
    } catch {}
    setSaving(false);
  }, [page.id, onSaved]);

  const handleHtmlChange = (value: string) => {
    setHtml(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(value), 500);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => setPreviewHtml(value), 300);
  };

  const insertVariable = (varName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const prefix = varName.startsWith('#') ? `{{${varName}}}` : `{{${varName}}}`;
    const newHtml = html.substring(0, start) + prefix + html.substring(end);
    setHtml(newHtml);
    handleHtmlChange(newHtml);
    // Focus back on textarea after insert
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(`{{${text}}}`).then(() => {
      setCopiedVar(text);
      setTimeout(() => setCopiedVar(null), 2000);
    }).catch(() => {});
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handlePublish = async (publish: boolean) => {
    try {
      const res = await fetch(`/api/pagebuilder/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: publish }),
      });
      if (res.ok) {
        onSaved();
        onBack();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to publish');
      }
    } catch {
      alert('Failed to update status');
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  // Render variable reference panel
  const renderVarPanel = () => (
    <div className="shrink-0 bg-muted/50 border-b border-border max-h-[40vh] overflow-y-auto">
      <div className="px-4 py-2">
        <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-2">Variable Reference</p>
        <div className="space-y-1">
          {VARIABLE_GROUPS.map((group) => {
            const isExpanded = expandedGroups[group.group] ?? (group.group === 'Site');
            return (
              <div key={group.group}>
                <button
                  onClick={() => toggleGroup(group.group)}
                  className="flex items-center gap-1 w-full text-left py-1 text-[10px] font-600 text-foreground hover:text-primary transition-colors"
                >
                  {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  {group.group}
                </button>
                {isExpanded && (
                  <div className="pl-4 space-y-0.5 pb-1">
                    {group.variables.map((v) => {
                      const displayName = v.name;
                      return (
                        <div key={displayName} className="flex items-center gap-2 group/item">
                          <button
                            onClick={() => insertVariable(displayName)}
                            className="text-[10px] text-primary font-mono bg-background px-1 rounded border border-primary/20 hover:bg-primary/10 transition-colors flex-shrink-0 cursor-pointer"
                            title="Click to insert"
                          >
                            {displayName.startsWith('#') ? `{{${displayName}}}` : `{{${displayName}}}`}
                          </button>
                          <span className="text-[9px] text-muted-foreground flex-1 truncate">{v.description}</span>
                          <button
                            onClick={() => copyToClipboard(displayName)}
                            className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-foreground p-0.5 transition-all"
                            title="Copy to clipboard"
                          >
                            {copiedVar === displayName ? <CheckCircle2 size={10} className="text-success" /> : <Copy size={10} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 bg-card border-b border-border px-4 py-3 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          Back to Pagebuilder
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-600 text-foreground truncate">{page.name}</p>
          <p className="text-[10px] text-muted-foreground">{page.slug} · {page.type}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-[10px] text-muted-foreground">{lastSaved}</span>
          )}
          {saving && (
            <span className="text-[10px] text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Saving...
            </span>
          )}
          <button
            onClick={() => setShowVars(!showVars)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-500 border border-border hover:bg-muted transition-colors"
            title="Toggle variable panel"
          >
            <Code size={12} />
            <span className="hidden sm:inline">Variables</span>
          </button>
          <button
            onClick={() => handlePublish(!page.isPublished)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-500 transition-colors ${
              page.isPublished
                ? 'bg-success-bg text-success border border-success/20 hover:bg-success/20'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Check size={12} />
            {page.isPublished ? 'Published' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left: HTML Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {showVars && renderVarPanel()}
          <textarea
            ref={textareaRef}
            value={html}
            onChange={(e) => handleHtmlChange(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full p-4 bg-background border-0 resize-none text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Paste your HTML here..."
          />
        </div>

        {/* Right: Live Preview */}
        <div className="w-1/2 flex flex-col border-l border-border">
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
            <Eye size={12} className="text-muted-foreground" />
            <span className="text-xs font-500 text-muted-foreground">Live Preview</span>
          </div>
          <div className="flex-1 bg-white relative">
            <iframe
              srcDoc={previewHtml}
              sandbox="allow-same-origin allow-scripts"
              className="w-full h-full border-0"
              title={`Preview: ${page.name}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}