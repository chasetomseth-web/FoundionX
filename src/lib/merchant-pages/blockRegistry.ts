import type { BlockType } from './types';

export const BLOCKS: Array<{ type: BlockType; label: string; description: string }> = [
  { type: 'section', label: 'Section', description: 'A page section wrapper.' },
  { type: 'container', label: 'Container', description: 'A centered content container.' },
  { type: 'row', label: 'Row', description: 'Layout row for responsive columns.' },
  { type: 'column', label: 'Column', description: 'Vertical column container.' },
  { type: 'hero', label: 'Hero', description: 'Hero section with headline and CTA.' },
  { type: 'text', label: 'Text', description: 'Rich text content block.' },
  { type: 'image', label: 'Image', description: 'Visual media block.' },
  { type: 'countdown', label: 'Countdown', description: 'Urgency timer for launches.' },
  { type: 'checkout', label: 'Checkout', description: 'Payment block for converting visitors.' },
  { type: 'affiliate', label: 'Affiliate', description: 'Sign up affiliates and track referrals.' },
  { type: 'html', label: 'HTML', description: 'Custom HTML embed block.' },
];

const containerBlockTypes: BlockType[] = ['section', 'container', 'row', 'column', 'hero'];

export function isContainerBlock(type: string) {
  return containerBlockTypes.includes(type as BlockType);
}
