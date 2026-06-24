import type { LucideIcon } from 'lucide-react';
import type { PageBlock, BlockType } from '../types';
import { BLOCK_DEFAULTS, type BlockDefinition } from './blockDefaults';
import { BLOCK_ICONS } from './blockIcons';
import { BLOCK_CATEGORIES } from './blockCategories';

export const BLOCK_REGISTRY: Array<BlockDefinition & { icon: LucideIcon; categoryLabel: string }> = [
  {
    type: 'section',
    label: 'Section',
    icon: BLOCK_ICONS.section,
    category: BLOCK_CATEGORIES.layout.label,
    ...BLOCK_DEFAULTS.section,
    acceptsChildren: true,
    allowedChildren: ['container', 'row', 'column', 'hero', 'text', 'image', 'countdown', 'checkout', 'affiliate', 'html'],
  },
  {
    type: 'container',
    label: 'Container',
    icon: BLOCK_ICONS.container,
    category: BLOCK_CATEGORIES.layout.label,
    ...BLOCK_DEFAULTS.container,
    acceptsChildren: true,
    allowedChildren: ['row', 'column', 'hero', 'text', 'image', 'countdown', 'checkout', 'affiliate', 'html'],
  },
  {
    type: 'row',
    label: 'Row',
    icon: BLOCK_ICONS.row,
    category: BLOCK_CATEGORIES.layout.label,
    ...BLOCK_DEFAULTS.row,
    acceptsChildren: true,
    allowedChildren: ['column', 'hero', 'text', 'image', 'countdown', 'checkout', 'affiliate', 'html'],
  },
  {
    type: 'column',
    label: 'Column',
    icon: BLOCK_ICONS.column,
    category: BLOCK_CATEGORIES.layout.label,
    ...BLOCK_DEFAULTS.column,
    acceptsChildren: true,
    allowedChildren: ['hero', 'text', 'image', 'countdown', 'checkout', 'affiliate', 'html'],
  },
  {
    type: 'hero',
    label: 'Hero',
    icon: BLOCK_ICONS.hero,
    category: BLOCK_CATEGORIES.content.label,
    ...BLOCK_DEFAULTS.hero,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'navbar',
    label: 'Navbar',
    icon: BLOCK_ICONS.navbar,
    category: BLOCK_CATEGORIES.content.label,
    ...BLOCK_DEFAULTS.navbar,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'text',
    label: 'Text',
    icon: BLOCK_ICONS.text,
    category: BLOCK_CATEGORIES.content.label,
    ...BLOCK_DEFAULTS.text,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'image',
    label: 'Image',
    icon: BLOCK_ICONS.image,
    category: BLOCK_CATEGORIES.content.label,
    ...BLOCK_DEFAULTS.image,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'countdown',
    label: 'Countdown',
    icon: BLOCK_ICONS.countdown,
    category: BLOCK_CATEGORIES.conversion.label,
    ...BLOCK_DEFAULTS.countdown,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'cta',
    label: 'Call to Action',
    icon: BLOCK_ICONS.cta,
    category: BLOCK_CATEGORIES.conversion.label,
    ...BLOCK_DEFAULTS.cta,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    icon: BLOCK_ICONS.testimonials,
    category: BLOCK_CATEGORIES.conversion.label,
    ...BLOCK_DEFAULTS.testimonials,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'checkout',
    label: 'Checkout',
    icon: BLOCK_ICONS.checkout,
    category: BLOCK_CATEGORIES.commerce.label,
    ...BLOCK_DEFAULTS.checkout,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'order_bump',
    label: 'Order Bump',
    icon: BLOCK_ICONS.order_bump,
    category: BLOCK_CATEGORIES.commerce.label,
    ...BLOCK_DEFAULTS.order_bump,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'upsell',
    label: 'Upsell',
    icon: BLOCK_ICONS.upsell,
    category: BLOCK_CATEGORIES.commerce.label,
    ...BLOCK_DEFAULTS.upsell,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'affiliate',
    label: 'Affiliate Promo',
    icon: BLOCK_ICONS.affiliate,
    category: BLOCK_CATEGORIES.growth.label,
    ...BLOCK_DEFAULTS.affiliate,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'affiliate_signup',
    label: 'Affiliate Signup',
    icon: BLOCK_ICONS.affiliate_signup,
    category: BLOCK_CATEGORIES.growth.label,
    ...BLOCK_DEFAULTS.affiliate_signup,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'referral_dashboard',
    label: 'Referral Dashboard',
    icon: BLOCK_ICONS.referral_dashboard,
    category: BLOCK_CATEGORIES.growth.label,
    ...BLOCK_DEFAULTS.referral_dashboard,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'html',
    label: 'Custom HTML',
    icon: BLOCK_ICONS.html,
    category: BLOCK_CATEGORIES.advanced.label,
    ...BLOCK_DEFAULTS.html,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'customer_login',
    label: 'Customer Login',
    icon: BLOCK_ICONS.customer_login,
    category: BLOCK_CATEGORIES.growth.label,
    ...BLOCK_DEFAULTS.customer_login,
    acceptsChildren: false,
    allowedChildren: [],
  },
  {
    type: 'script',
    label: 'Custom Script',
    icon: BLOCK_ICONS.script,
    category: BLOCK_CATEGORIES.advanced.label,
    ...BLOCK_DEFAULTS.script,
    acceptsChildren: false,
    allowedChildren: [],
  },
];

export const BLOCK_DEFINITIONS = BLOCK_REGISTRY.reduce<Record<BlockType, BlockDefinition>>((acc, definition) => {
  acc[definition.type] = {
    type: definition.type,
    label: definition.label,
    category: definition.category,
    defaultProps: definition.defaultProps,
    defaultStyle: definition.defaultStyle,
    acceptsChildren: definition.acceptsChildren,
    allowedChildren: definition.allowedChildren,
  };
  return acc;
}, {} as Record<BlockType, BlockDefinition>);

export const BLOCK_TYPES = BLOCK_REGISTRY.map((block) => block.type);
export const BLOCK_CATEGORIES_BY_LABEL = BLOCK_REGISTRY.reduce<Record<string, Array<typeof BLOCK_REGISTRY[number]>>>((acc, block) => {
  acc[block.category] = [...(acc[block.category] || []), block];
  return acc;
}, {});

export function getBlockDefinition(type: BlockType) {
  return BLOCK_REGISTRY.find((definition) => definition.type === type);
}
