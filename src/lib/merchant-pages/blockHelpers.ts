import { prisma } from '@/lib/prisma';
import { PageBlock, BlockType } from './types';
import { isContainerBlock } from './blockRegistry';
import { getBlockDefinition } from './registry/blockRegistry';

export function createBlockId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function sortBlocks(blocks: PageBlock[]) {
  return [...blocks].sort((a, b) => a.order - b.order);
}

export function normalizeParentOrder(items: PageBlock[]) {
  return sortBlocks(items).map((block, index) => ({ ...block, order: index }));
}

export function blockAcceptsChildren(type: string) {
  return isContainerBlock(type);
}

export function slugifyPageName(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${normalized || 'merchant-page'}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function resolveStoreId(storeId?: string) {
  if (typeof storeId === 'string' && storeId.trim().length > 0) {
    return storeId;
  }

  const store = await prisma.store.findFirst();
  if (!store) {
    throw new Error('No store available to associate Merchant Page with');
  }

  return store.id;
}

export async function getDefaultStoreId() {
  return resolveStoreId();
}

export function buildDefaultBlock(pageId: string, parentId: string | null, type: BlockType, order: number): PageBlock {
  const definition = getBlockDefinition(type);
  const defaults = definition
    ? {
        props: definition.defaultProps,
        style: definition.defaultStyle,
      }
    : {
        props: {},
        style: {
          backgroundColor: '#ffffff',
          textColor: '#111827',
          borderColor: '#e2e8f0',
        },
      };

  return {
    id: createBlockId(),
    pageId,
    parentId,
    order,
    type,
    props: defaults.props,
    style: defaults.style,
  };
}

export async function ensurePageExists(pageId: string, storeId?: string) {
  const resolvedStoreId = await resolveStoreId(storeId);
  const page = await prisma.merchantPage.findFirst({ where: { id: pageId, storeId: resolvedStoreId } });
  if (!page) {
    throw new Error('Merchant Page not found');
  }
  return page;
}

export async function createMerchantPageRecord(name: string, storeId?: string) {
  const resolvedStoreId = await resolveStoreId(storeId);
  return prisma.merchantPage.create({
    data: {
      name,
      slug: slugifyPageName(name),
      storeId: resolvedStoreId,
      metadata: {},
      settings: {},
    },
  });
}
