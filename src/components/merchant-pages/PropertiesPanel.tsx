import { useMemo, useState } from 'react';
import type { PageBlock } from '@/lib/merchant-pages/types';

interface PropertiesPanelProps {
  selectedBlock: PageBlock | null;
  onUpdateBlock: (update: Partial<PageBlock>) => void;
  onDelete: () => void;
  blockError: string | null;
}

const tabLabels = [
  { key: 'content', label: 'Content' },
  { key: 'style', label: 'Style' },
  { key: 'advanced', label: 'Advanced' },
] as const;

type TabKey = (typeof tabLabels)[number]['key'];

export default function PropertiesPanel({ selectedBlock, onUpdateBlock, onDelete, blockError }: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('content');
  const [rawProps, setRawProps] = useState('');
  const [rawStyle, setRawStyle] = useState('');

  const blockProps = useMemo(() => selectedBlock?.props ?? {}, [selectedBlock]);
  const blockStyle = useMemo(() => selectedBlock?.style ?? {}, [selectedBlock]);

  const handleJsonChange = (field: 'props' | 'style', value: string) => {
    if (field === 'props') {
      setRawProps(value);
    } else {
      setRawStyle(value);
    }
  };

  const handleJsonBlur = (field: 'props' | 'style', value: string) => {
    try {
      const parsed = JSON.parse(value);
      onUpdateBlock({ [field]: parsed } as Partial<PageBlock>);
    } catch {
      // ignore invalid JSON until corrected
    }
  };

  const renderContentFields = () => {
    if (!selectedBlock) return null;
    switch (selectedBlock.type) {
      case 'hero':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Headline</label>
            <input
              value={String(blockProps.title ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, title: event.target.value } })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <label className="block text-sm font-semibold text-slate-700">Subheadline</label>
            <textarea
              value={String(blockProps.subtitle ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, subtitle: event.target.value } })}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">CTA text</label>
              <input
                value={String(blockProps.ctaText ?? '')}
                onChange={(event) => onUpdateBlock({ props: { ...blockProps, ctaText: event.target.value } })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
              <label className="block text-sm font-semibold text-slate-700">CTA URL</label>
              <input
                value={String(blockProps.ctaUrl ?? '')}
                onChange={(event) => onUpdateBlock({ props: { ...blockProps, ctaUrl: event.target.value } })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Text</label>
            <textarea
              value={String(blockProps.text ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, text: event.target.value } })}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </div>
        );
      case 'image':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Image URL</label>
            <input
              value={String(blockProps.src ?? blockProps.imageUrl ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, src: event.target.value, imageUrl: event.target.value } })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <label className="block text-sm font-semibold text-slate-700">Alt text</label>
            <input
              value={String(blockProps.alt ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, alt: event.target.value } })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </div>
        );
      case 'countdown':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Headline</label>
            <input
              value={String(blockProps.title ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, title: event.target.value } })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <label className="block text-sm font-semibold text-slate-700">Subheadline</label>
            <textarea
              value={String(blockProps.subtitle ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, subtitle: event.target.value } })}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </div>
        );
      case 'checkout':
      case 'order_bump':
      case 'upsell':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Title</label>
            <input
              value={String(blockProps.title ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, title: event.target.value } })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <label className="block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              value={String(blockProps.description ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, description: event.target.value } })}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">Button text</label>
              <input
                value={String(blockProps.buttonText ?? blockProps.ctaText ?? '')}
                onChange={(event) => onUpdateBlock({ props: { ...blockProps, buttonText: event.target.value, ctaText: event.target.value } })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
              <label className="block text-sm font-semibold text-slate-700">Button URL</label>
              <input
                value={String(blockProps.buttonUrl ?? blockProps.ctaUrl ?? '')}
                onChange={(event) => onUpdateBlock({ props: { ...blockProps, buttonUrl: event.target.value, ctaUrl: event.target.value } })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </div>
            {selectedBlock.type === 'checkout' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Product ID</label>
                  <input
                    value={String(blockProps.productId ?? '')}
                    onChange={(event) => onUpdateBlock({ props: { ...blockProps, productId: event.target.value } })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Price</label>
                  <input
                    value={String(blockProps.price ?? '')}
                    onChange={(event) => onUpdateBlock({ props: { ...blockProps, price: event.target.value } })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      case 'affiliate':
      case 'affiliate_signup':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Title</label>
            <input
              value={String(blockProps.title ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, title: event.target.value } })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <label className="block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              value={String(blockProps.description ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, description: event.target.value } })}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <label className="block text-sm font-semibold text-slate-700">CTA text</label>
            <input
              value={String(blockProps.ctaText ?? blockProps.buttonText ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, ctaText: event.target.value, buttonText: event.target.value } })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
            <label className="block text-sm font-semibold text-slate-700">CTA URL</label>
            <input
              value={String(blockProps.ctaUrl ?? blockProps.buttonUrl ?? '')}
              onChange={(event) => onUpdateBlock({ props: { ...blockProps, ctaUrl: event.target.value, buttonUrl: event.target.value } })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">No editable content fields are available for this block type.</p>
          </div>
        );
    }
  };

  const renderStyleFields = () => (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-slate-700">Background color</label>
      <input
        value={String(blockStyle.backgroundColor ?? '')}
        onChange={(event) => onUpdateBlock({ style: { ...blockStyle, backgroundColor: event.target.value } })}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Text color</label>
          <input
            value={String(blockStyle.textColor ?? '')}
            onChange={(event) => onUpdateBlock({ style: { ...blockStyle, textColor: event.target.value } })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Border color</label>
          <input
            value={String(blockStyle.borderColor ?? '')}
            onChange={(event) => onUpdateBlock({ style: { ...blockStyle, borderColor: event.target.value } })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Padding</label>
          <input
            value={String(blockStyle.padding ?? '')}
            onChange={(event) => onUpdateBlock({ style: { ...blockStyle, padding: event.target.value } })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Alignment</label>
          <input
            value={String(blockStyle.align ?? '')}
            onChange={(event) => onUpdateBlock({ style: { ...blockStyle, align: event.target.value } })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Max width</label>
          <input
            value={String(blockStyle.maxWidth ?? '')}
            onChange={(event) => onUpdateBlock({ style: { ...blockStyle, maxWidth: event.target.value } })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Border radius</label>
          <input
            value={String(blockStyle.borderRadius ?? '')}
            onChange={(event) => onUpdateBlock({ style: { ...blockStyle, borderRadius: event.target.value } })}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  const renderAdvancedFields = () => (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-slate-700">Raw props JSON</label>
      <textarea
        value={rawProps || JSON.stringify(blockProps, null, 2)}
        onChange={(event) => handleJsonChange('props', event.target.value)}
        onBlur={(event) => handleJsonBlur('props', event.target.value)}
        className="h-36 w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
      />
      <label className="block text-sm font-semibold text-slate-700">Raw style JSON</label>
      <textarea
        value={rawStyle || JSON.stringify(blockStyle, null, 2)}
        onChange={(event) => handleJsonChange('style', event.target.value)}
        onBlur={(event) => handleJsonBlur('style', event.target.value)}
        className="h-36 w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => {
          if (selectedBlock) {
            onUpdateBlock({ props: { ...blockProps, updatedAt: new Date().toISOString() } });
          }
        }}
        className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
      >
        Refresh block values
      </button>
    </div>
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Properties</h2>
          {selectedBlock ? (
            <p className="text-sm text-slate-500">{selectedBlock.type} • ID {selectedBlock.id}</p>
          ) : null}
        </div>
      </div>

      {selectedBlock ? (
        <div className="mt-5 space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {tabLabels.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            {activeTab === 'content' && renderContentFields()}
            {activeTab === 'style' && renderStyleFields()}
            {activeTab === 'advanced' && renderAdvancedFields()}
          </div>

          {blockError ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{blockError}</div> : null}

          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            Delete selected block
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          Select a block to inspect and configure it.
        </div>
      )}
    </section>
  );
}
