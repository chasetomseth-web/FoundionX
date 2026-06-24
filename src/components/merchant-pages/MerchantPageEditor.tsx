'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { BlockType, PageBlock, blockAcceptsChildren, sortBlocks, buildDefaultBlock, normalizeParentOrder } from '@/lib/merchant-pages';
import { fetchMerchantPage, generateFunnel, deleteMerchantPage, publishMerchantPage } from '@/lib/merchant-pages/api';
import { blocksToHtml } from '@/lib/merchant-pages/preview';
import SidebarBlocks from './SidebarBlocks';
import PropertiesPanel from './PropertiesPanel';
import BlockRenderer from './BlockRenderer';
import Modal from '@/components/ui/Modal';

interface MerchantPageEditorProps {
  pageId: string;
}

export default function MerchantPageEditor({ pageId }: MerchantPageEditorProps) {
  const [pageTitle, setPageTitle] = useState('Merchant Page Editor');
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [propsJson, setPropsJson] = useState('');
  const [styleJson, setStyleJson] = useState('');
  const [blockError, setBlockError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewHtml, setPreviewHtml] = useState('');
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const saveTimeout = useRef<number | null>(null);
  const previewTimeout = useRef<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    setStoreId(new URL(window.location.href).searchParams.get('storeId') ?? '');
  }, []);

  useEffect(() => {
    async function loadPage() {
      try {
        const data = await fetchMerchantPage(pageId, storeId || undefined);
        setPageTitle(data.page?.name ?? 'Merchant Page Editor');
        setBlocks(sortBlocks(data.blocks ?? []));
        setSelectedBlockId(data.blocks?.[0]?.id ?? null);
        setIsLoaded(true);
      } catch (error) {
        console.error('[MERCHANT PAGES] editor load error:', error);
        setApiError((error as Error).message || 'Failed to load Merchant Page');
      }
    }

    if (storeId !== '') {
      loadPage();
    }
  }, [pageId, storeId]);

  useEffect(() => {
    if (!isLoaded || !isDirty || isSaving) return;

    console.log('Autosave triggered');
    window.clearTimeout(saveTimeout.current ?? undefined);
    saveTimeout.current = window.setTimeout(() => {
      savePage();
    }, 1500);

    return () => {
      window.clearTimeout(saveTimeout.current ?? undefined);
    };
  }, [blocks, isDirty, isLoaded, isSaving]);

  useEffect(() => {
    window.clearTimeout(previewTimeout.current ?? undefined);
    previewTimeout.current = window.setTimeout(() => {
      setPreviewHtml(blocks.length > 0 ? blocksToHtml(blocks) : '');
    }, 200);

    return () => {
      window.clearTimeout(previewTimeout.current ?? undefined);
    };
  }, [blocks]);

  useEffect(() => {
    const block = blocks.find((block) => block.id === selectedBlockId);
    if (!block) {
      setPropsJson('');
      setStyleJson('');
      return;
    }
    setPropsJson(JSON.stringify(block.props ?? {}, null, 2));
    setStyleJson(JSON.stringify(block.style ?? {}, null, 2));
  }, [selectedBlockId, blocks]);

  function getChildren(parentId: string | null) {
    return sortBlocks(blocks.filter((block) => block.parentId === parentId));
  }

  function updateBlock(id: string, update: Partial<PageBlock>) {
    setIsDirty(true);
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...update, updatedAt: new Date().toISOString() } : block))
    );
  }

  function deleteBlockTree(id: string) {
    const removeIds = new Set<string>([id]);
    let found = true;
    while (found) {
      found = false;
      for (const block of blocks) {
        if (block.parentId && removeIds.has(block.parentId) && !removeIds.has(block.id)) {
          removeIds.add(block.id);
          found = true;
        }
      }
    }

    setBlocks((current) => current.filter((block) => !removeIds.has(block.id)));
    setSelectedBlockId((current) => (current && removeIds.has(current) ? null : current));
    setIsDirty(true);
  }

  function selectBlock(blockId: string) {
    setSelectedBlockId(blockId);
  }

  function getDescendantIds(blockId: string): string[] {
    const children = blocks.filter((block) => block.parentId === blockId);
    return [blockId, ...children.flatMap((child) => getDescendantIds(child.id))];
  }

  function duplicateBlock(blockId: string) {
    const root = blocks.find((block) => block.id === blockId);
    if (!root) return;

    const subtreeIds = getDescendantIds(blockId);
    const idMap = new Map<string, string>(subtreeIds.map((id) => [id, crypto.randomUUID()]));

    const clones = blocks
      .filter((block) => subtreeIds.includes(block.id))
      .map((block) => ({
        ...block,
        id: idMap.get(block.id) as string,
        parentId: block.parentId ? (idMap.get(block.parentId) ?? null) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    const clonedRootId = idMap.get(blockId) as string;
    const clonesWithoutRoot = clones.filter((block) => block.id !== clonedRootId);
    const clonedRoot = clones.find((block) => block.id === clonedRootId);
    if (!clonedRoot) return;

    const clonedRootWithOrder = { ...clonedRoot, order: (root.order ?? 0) + 0.5 };
    const updatedBlocks = [...blocks, ...clonesWithoutRoot, clonedRootWithOrder];

    const siblingGroup = updatedBlocks.filter((block) => block.parentId === root.parentId);
    const normalizedSiblings = normalizeParentOrder(siblingGroup);
    const normalizedBlockMap = new Map(normalizedSiblings.map((block) => [block.id, block.order]));

    const finalBlocks = updatedBlocks.map((block) =>
      normalizedBlockMap.has(block.id) ? { ...block, order: normalizedBlockMap.get(block.id) as number } : block
    );

    setBlocks(finalBlocks);
    setSelectedBlockId(clonedRootId);
    setIsDirty(true);
  }

  function moveBlockUp(blockId: string) {
    setBlocks((current) => {
      const block = current.find((item) => item.id === blockId);
      if (!block) return current;

      const siblings = sortBlocks(current.filter((item) => item.parentId === block.parentId));
      const index = siblings.findIndex((item) => item.id === blockId);
      if (index <= 0) return current;

      const swapped = [...siblings];
      [swapped[index - 1], swapped[index]] = [swapped[index], swapped[index - 1]];
      const reordered = swapped.map((item, idx) => ({ ...item, order: idx }));
      const updateMap = new Map(reordered.map((item) => [item.id, item.order]));

      return current.map((item) =>
        updateMap.has(item.id) ? { ...item, order: updateMap.get(item.id) as number } : item
      );
    });
    setIsDirty(true);
  }

  function moveBlockDown(blockId: string) {
    setBlocks((current) => {
      const block = current.find((item) => item.id === blockId);
      if (!block) return current;

      const siblings = sortBlocks(current.filter((item) => item.parentId === block.parentId));
      const index = siblings.findIndex((item) => item.id === blockId);
      if (index === -1 || index === siblings.length - 1) return current;

      const swapped = [...siblings];
      [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
      const reordered = swapped.map((item, idx) => ({ ...item, order: idx }));
      const updateMap = new Map(reordered.map((item) => [item.id, item.order]));

      return current.map((item) =>
        updateMap.has(item.id) ? { ...item, order: updateMap.get(item.id) as number } : item
      );
    });
    setIsDirty(true);
  }

  function addBlock(type: BlockType, parentId: string | null = null) {
    const siblings = getChildren(parentId);
    const block = buildDefaultBlock(pageId, parentId, type, siblings.length);
    setBlocks((current) => [...current, block]);
    setSelectedBlockId(block.id);
    setIsDirty(true);
  }

  function handleReorder(activeId: string, overId: string | null) {
    const activeBlock = blocks.find((block) => block.id === activeId);
    if (!activeBlock) return;

    if (overId === null) {
      const destination = sortBlocks(blocks.filter((block) => block.parentId === null && block.id !== activeId));
      const reordered = [...destination, { ...activeBlock, parentId: null }].map((block, index) => ({ ...block, order: index }));
      const sourceGroup = normalizeParentOrder(blocks.filter((block) => block.parentId === activeBlock.parentId && block.id !== activeId));
      const otherBlocks = blocks.filter(
        (block) => block.parentId !== null && block.parentId !== activeBlock.parentId && block.id !== activeId
      );

      setBlocks([...otherBlocks, ...reordered, ...sourceGroup]);
      setIsDirty(true);
      return;
    }

    const overBlock = blocks.find((block) => block.id === overId);
    if (!overBlock) return;

    const targetParent = blockAcceptsChildren(overBlock.type) ? overBlock.id : overBlock.parentId;

    if (activeBlock.parentId === targetParent) {
      const siblings = getChildren(targetParent);
      const oldIndex = siblings.findIndex((block) => block.id === activeId);
      const newIndex = siblings.findIndex((block) => block.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(siblings, oldIndex, newIndex).map((block, index) => ({ ...block, order: index }));
      setBlocks((current) =>
        current.map((block) => {
          const updated = reordered.find((item) => item.id === block.id);
          return updated ? updated : block;
        })
      );
      setIsDirty(true);
      return;
    }

    const destination = sortBlocks(blocks.filter((block) => block.parentId === targetParent && block.id !== activeId));
    const insertionIndex = targetParent === overBlock.parentId ? destination.findIndex((block) => block.id === overId) : -1;
    const activeUpdated = { ...activeBlock, parentId: targetParent };
    const reorderedDest = [...destination];
    if (insertionIndex === -1) {
      reorderedDest.push(activeUpdated);
    } else {
      reorderedDest.splice(insertionIndex, 0, activeUpdated);
    }

    const normalizedDest = reorderedDest.map((block, index) => ({ ...block, order: index }));
    const sourceGroup = normalizeParentOrder(blocks.filter((block) => block.parentId === activeBlock.parentId && block.id !== activeId));
    const otherBlocks = blocks.filter(
      (block) => block.parentId !== targetParent && block.parentId !== activeBlock.parentId && block.id !== activeId
    );

    setBlocks([...otherBlocks, ...normalizedDest, ...sourceGroup]);
    setIsDirty(true);
  }

  async function savePage() {
    if (!pageId || isSaving) return;

    console.log('Saving merchant page...');
    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);

    try {
      const payload: Record<string, unknown> = { pageId, blocks };
      if (storeId) {
        payload.storeId = storeId;
      }

      const response = await fetch('/api/merchant-pages/update-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Save failed');
      }

      setIsDirty(false);
      setSaveStatus('saved');
      setLastSavedAt(new Date().toISOString());
      console.log('Save success');
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setSaveError((error as Error).message || 'Save failed');
      console.log('Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  function updateSelectedJson(field: 'props' | 'style', rawValue: string) {
    try {
      const parsed = JSON.parse(rawValue);
      if (selectedBlockId) {
        updateBlock(selectedBlockId, { [field]: parsed } as Partial<PageBlock>);
      }
      setBlockError(null);
    } catch (error) {
      setBlockError('Invalid JSON payload');
    }
  }

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId]
  );

  function SortableBlockItem({ block, depth }: { block: PageBlock; depth: number }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
    };

    const isActiveDropContainer = dragOverId === block.id && blockAcceptsChildren(block.type);
    const showInsertionLine = dragOverId === block.id && !blockAcceptsChildren(block.type) && dragActiveId !== block.id;
    const isSelected = selectedBlockId === block.id;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative mb-4 rounded-3xl border bg-white p-4 shadow-sm transition-all duration-150 ${
          isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:-translate-y-0.5 hover:shadow-md'
        } ${isActiveDropContainer ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400' : 'border-slate-200'} `}
      >
        {blockAcceptsChildren(block.type) ? (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-700 opacity-80">
            {block.type.toUpperCase()}
          </span>
        ) : null}

        <div className="pointer-events-none absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-slate-100/90 px-2 py-1 text-xs text-slate-700 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              className="rounded-full px-2 py-1 font-semibold hover:bg-slate-200"
              onClick={() => selectBlock(block.id)}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-1 font-semibold hover:bg-slate-200"
              onClick={() => duplicateBlock(block.id)}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-1 font-semibold hover:bg-slate-200"
              onClick={() => moveBlockUp(block.id)}
            >
              ↑
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-1 font-semibold hover:bg-slate-200"
              onClick={() => moveBlockDown(block.id)}
            >
              ↓
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-1 font-semibold text-rose-700 hover:bg-rose-100"
              onClick={() => deleteBlockTree(block.id)}
            >
              Delete
            </button>
          </div>
        </div>

        {showInsertionLine ? (
          <div className="absolute inset-x-4 -top-2 h-1 rounded-full bg-sky-500 opacity-90 transition-all duration-150" />
        ) : null}

        <div
          className={`cursor-pointer rounded-3xl border p-3 transition ${
            isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
          onClick={() => setSelectedBlockId(block.id)}
          {...attributes}
          {...listeners}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-semibold text-slate-900">{block.type}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Depth {depth}</span>
          </div>
          <BlockRenderer block={block} />
          {blockAcceptsChildren(block.type) ? (
            <div className={`mt-4 rounded-3xl border border-dashed p-4 ${isActiveDropContainer ? 'border-blue-400 bg-blue-50/80' : 'border-slate-200 bg-slate-50'}`}>
              {renderBlocks(block.id, depth + 1) ?? (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white/80 p-6 text-center text-slate-400">
                  + Drop blocks here
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
            onClick={() => addBlock('text', block.id)}
          >
            + Add child
          </button>
          <button
            type="button"
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 hover:bg-rose-100"
            onClick={() => deleteBlockTree(block.id)}
          >
            Delete block
          </button>
        </div>
      </div>
    );
  }

  function renderBlocks(parentId: string | null, depth = 0) {
    const children = getChildren(parentId);
    if (children.length === 0) {
      return null;
    }

    return (
      <SortableContext items={children.map((block) => block.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {children.map((block) => (
            <SortableBlockItem key={block.id} block={block} depth={depth} />
          ))}
        </div>
      </SortableContext>
    );
  }

  async function handleGenerateFunnel(prompt: string) {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const pages = await generateFunnel(prompt);
      const generated = pages?.[0]?.blocks ?? [];
      if (!generated.length) {
        throw new Error('AI return did not include a page');
      }

      const hydratedBlocks = generated.map((block, index) => ({
        ...block,
        pageId,
        parentId: block.parentId ?? null,
        order: Number(block.order ?? index),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setBlocks(hydratedBlocks);
      setSelectedBlockId(hydratedBlocks[0]?.id ?? null);
      setIsDirty(true);
      setShowGenerateModal(false);
    } catch (error) {
      console.error('[MERCHANT PAGES] AI error:', error);
      setGenerateError((error as Error).message || 'AI funnel generation failed');
    } finally {
      setIsGenerating(false);
    }
  }

  function openGenerateModal() {
    setGenerateError(null);
    setAiPrompt('');
    setShowGenerateModal(true);
  }

  function closeGenerateModal() {
    if (!isGenerating) {
      setShowGenerateModal(false);
    }
  }

  async function submitGenerateFunnel() {
    if (!aiPrompt.trim()) {
      setGenerateError('Please enter a prompt to generate a funnel.');
      return;
    }
    await handleGenerateFunnel(aiPrompt.trim());
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Merchant Pages</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">{pageTitle}</h1>
              <p className="mt-2 text-slate-600">Build a monetized funnel visually and save the page tree to PostgreSQL.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={savePage}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={openGenerateModal}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : '🤖 Generate Funnel'}
              </button>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Saved ✓'}
                {saveStatus === 'error' && (saveError ? `Error: ${saveError}` : 'Save failed')}
                {saveStatus === 'idle' && isDirty && 'Unsaved changes'}
                {saveStatus === 'idle' && !isDirty && 'Saved ✓'}
                {lastSavedAt && saveStatus === 'saved' ? ` • ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : null}
              </div>
            </div>
          </div>
        </header>

        <Modal open={showGenerateModal} onClose={closeGenerateModal} title="Generate AI Funnel" size="md">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Funnel prompt</label>
            <textarea
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              rows={6}
              placeholder="Build a supplement sales funnel with a hero, pricing, testimonials, and checkout."
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Prompt examples:</p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>• Build a supplement sales funnel</li>
                <li>• Create a SaaS webinar landing page</li>
                <li>• Generate a fitness coaching funnel</li>
              </ul>
            </div>
            {generateError ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {generateError}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeGenerateModal}
                className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitGenerateFunnel}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating Funnel...' : 'Generate Funnel'}
              </button>
            </div>
          </div>
        </Modal>

        <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Page canvas</h2>
                  <p className="mt-1 text-sm text-slate-500">Drag blocks to reorder, nest, and compose a full funnel page.</p>
                </div>
                <Link
                  href={`/merchant-pages${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''}`}
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Back to merchant pages
                </Link>
              </div>

              {apiError ? (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{apiError}</div>
              ) : null}

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(event) => {
                    setDragActiveId(String(event.active.id));
                    setDragOverId(event.over ? String(event.over.id) : null);
                  }}
                  onDragOver={(event) => {
                    setDragOverId(event.over ? String(event.over.id) : null);
                  }}
                  onDragEnd={(event) => {
                    const activeId = String(event.active.id);
                    const overId = event.over ? String(event.over.id) : null;
                    handleReorder(activeId, overId);
                    setDragActiveId(null);
                    setDragOverId(null);
                  }}
                  onDragCancel={() => {
                    setDragActiveId(null);
                    setDragOverId(null);
                  }}
                >
                  {renderBlocks(null, 0) ?? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                      <p className="text-lg font-semibold">No blocks yet</p>
                      <p className="mt-2">Use the palette on the right to add block types and start building your page layout.</p>
                    </div>
                  )}
                </DndContext>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Live page preview</h2>
                <span className="text-sm text-slate-500">Rendered funnel output</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold ${previewMode === 'desktop' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    onClick={() => setPreviewMode('desktop')}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold ${previewMode === 'tablet' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    onClick={() => setPreviewMode('tablet')}
                  >
                    Tablet
                  </button>
                  <button
                    type="button"
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold ${previewMode === 'mobile' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    onClick={() => setPreviewMode('mobile')}
                  >
                    Mobile
                  </button>
                </div>
                {blocks.length > 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                        {previewMode === 'desktop' ? 'Desktop preview — 1440px' : previewMode === 'tablet' ? 'Tablet preview — 768px' : 'Mobile preview — 390px'}
                      </div>
                      <div className="flex justify-center p-4">
                        <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-slate-50`} style={{ width: previewMode === 'desktop' ? 1140 : previewMode === 'tablet' ? 768 : 390, minHeight: 640 }}>
                          <iframe
                            key={`${previewMode}-${previewHtml.length}`}
                            srcDoc={previewHtml}
                            title="Live page preview"
                            className="h-full w-full bg-white"
                            style={{ minHeight: 640, border: 'none' }}
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                    No preview available until blocks are added.
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <SidebarBlocks
              onAddBlock={(type) =>
                addBlock(
                  type,
                  selectedBlockId && blockAcceptsChildren(blocks.find((block) => block.id === selectedBlockId)?.type ?? '')
                    ? selectedBlockId
                    : null
                )
              }
            />

            <PropertiesPanel
              selectedBlock={selectedBlock}
              propsJson={propsJson}
              styleJson={styleJson}
              blockError={blockError}
              onPropsChange={setPropsJson}
              onStyleChange={setStyleJson}
              onPropsBlur={(value) => updateSelectedJson('props', value)}
              onStyleBlur={(value) => updateSelectedJson('style', value)}
              onDelete={() => selectedBlock && deleteBlockTree(selectedBlock.id)}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
