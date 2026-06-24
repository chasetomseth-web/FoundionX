import { createBlockId } from '../helpers';
import type { PageBlock } from '../types';

export type PageBlockNode = PageBlock & {
  children: PageBlockNode[];
};

export function normalizeSiblingOrder(blocks: PageBlock[]): PageBlock[] {
  const buckets = new Map<string | null, PageBlock[]>();

  for (const block of blocks) {
    const parentKey = block.parentId ?? null;
    const group = buckets.get(parentKey) ?? [];
    group.push(block);
    buckets.set(parentKey, group);
  }

  const normalized: PageBlock[] = [];
  for (const group of buckets.values()) {
    group.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    normalized.push(
      ...group.map((block, index) => ({
        ...block,
        order: index,
      })),
    );
  }

  return normalized;
}

export function getDescendantIds(blocks: PageBlock[], blockId: string): string[] {
  const directChildren = blocks.filter((block) => block.parentId === blockId);
  const allIds = directChildren.flatMap((child) => getDescendantIds(blocks, child.id));
  return [blockId, ...allIds];
}

export function removeBlockTree(blocks: PageBlock[], blockId: string) {
  const toRemove = new Set(getDescendantIds(blocks, blockId));
  return normalizeSiblingOrder(blocks.filter((block) => !toRemove.has(block.id)));
}

export function insertBlock(blocks: PageBlock[], newBlock: PageBlock, parentId: string | null = null) {
  const siblings = blocks
    .filter((block) => block.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const insert = {
    ...newBlock,
    parentId,
    order: siblings.length,
  };

  return normalizeSiblingOrder([...blocks, insert]);
}

export function moveBlock(
  blocks: PageBlock[],
  blockId: string,
  targetParentId: string | null,
  targetIndex?: number,
) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) {
    return blocks;
  }

  const sourceParentId = block.parentId ?? null;
  const updated = blocks.map((item) => (item.id === blockId ? { ...item, parentId: targetParentId } : item));
  const destination = updated
    .filter((item) => item.parentId === targetParentId && item.id !== blockId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const insertionIndex = typeof targetIndex === 'number' ? Math.max(0, Math.min(targetIndex, destination.length)) : destination.length;
  const movedBlock = { ...block, parentId: targetParentId };
  destination.splice(insertionIndex, 0, movedBlock);

  const normalizedDestination = destination.map((item, index) => ({ ...item, order: index }));
  const normalizedSource = updated
    .filter((item) => item.parentId === sourceParentId && item.id !== blockId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item, index) => ({ ...item, order: index }));

  return normalizeSiblingOrder(
    updated
      .filter((item) => item.parentId !== sourceParentId && item.parentId !== targetParentId)
      .concat(normalizedSource)
      .concat(normalizedDestination),
  );
}

function cloneTree(blocks: PageBlock[], idMap: Map<string, string>) {
  return blocks
    .filter((block) => idMap.has(block.id))
    .map((block) => ({
      ...block,
      id: idMap.get(block.id) as string,
      parentId: block.parentId ? idMap.get(block.parentId) ?? null : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
}

export function duplicateBlock(blocks: PageBlock[], blockId: string) {
  const root = blocks.find((block) => block.id === blockId);
  if (!root) {
    return blocks;
  }

  const subtreeIds = getDescendantIds(blocks, blockId);
  const idMap = new Map<string, string>(subtreeIds.map((id) => [id, createBlockId()]));
  const clones = cloneTree(blocks, idMap);
  const clonedRoot = clones.find((block) => block.id === idMap.get(root.id));
  if (!clonedRoot) {
    return blocks;
  }

  const clonedRootWithOrder = {
    ...clonedRoot,
    order: root.order + 0.5,
  };

  return normalizeSiblingOrder([...blocks, ...clones.filter((block) => block.id !== clonedRoot.id), clonedRootWithOrder]);
}

export function buildTree(blocks: PageBlock[]): PageBlockNode[] {
  const nodeMap = new Map<string, PageBlockNode>();
  const roots: PageBlockNode[] = [];

  blocks.forEach((block) => {
    nodeMap.set(block.id, { ...block, children: [] });
  });

  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: PageBlockNode[]) => {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    list.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}
