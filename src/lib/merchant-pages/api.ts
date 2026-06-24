import { PageBlock } from './types';

export async function fetchMerchantPage(pageId: string, storeId?: string) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const response = await fetch(`/api/merchant-pages/${pageId}${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to fetch Merchant Page');
  }
  return data;
}

export async function createMerchantPage(name: string, storeId?: string) {
  const response = await fetch('/api/merchant-pages/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, storeId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to create Merchant Page');
  }
  return data.page;
}

export async function updateMerchantPageBlocks(pageId: string, storeId: string | undefined, blocks: PageBlock[]) {
  const response = await fetch('/api/merchant-pages/update-blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId, storeId, blocks }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to update page blocks');
  }
  return data;
}

export async function deleteMerchantPage(pageId: string, storeId?: string) {
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const response = await fetch(`/api/merchant-pages/${pageId}${query}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to delete Merchant Page');
  }
  return data;
}

export async function publishMerchantPage(pageId: string, storeId?: string) {
  const response = await fetch('/api/merchant-pages/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId, storeId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to publish Merchant Page');
  }
  return data;
}

export async function generateFunnel(prompt: string) {
  const response = await fetch('/api/ai/generate-funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to generate funnel');
  }
  return data.pages as Array<{ name: string; blocks: PageBlock[] }>;
}
