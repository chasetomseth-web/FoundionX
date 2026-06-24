export type BlockCategory =
  | 'layout'
  | 'content'
  | 'conversion'
  | 'commerce'
  | 'growth'
  | 'advanced';

export const BLOCK_CATEGORIES: Record<BlockCategory, { label: string }> = {
  layout: { label: 'Layout' },
  content: { label: 'Content' },
  conversion: { label: 'Conversion' },
  commerce: { label: 'Commerce' },
  growth: { label: 'Growth' },
  advanced: { label: 'Advanced' },
};
