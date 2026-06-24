import { createBlockId } from '../blockHelpers';
import { getBlockDefinition } from '../registry/blockRegistry';
import type { PageBlock, BlockType } from '../types';

const buildBlock = (type: BlockType, parentId: string | null, order: number, overrides?: Record<string, any>, styleOverrides?: Record<string, any>): PageBlock => {
  const definition = getBlockDefinition(type);
  if (!definition) {
    throw new Error(`Unknown block type: ${type}`);
  }

  return {
    id: createBlockId(),
    type,
    parentId,
    order,
    props: { ...(definition.defaultProps as Record<string, any>), ...overrides },
    style: { ...(definition.defaultStyle as Record<string, any>), ...styleOverrides },
  };
};

export type FunnelTemplate = {
  id: string;
  title: string;
  description: string;
  blocks: PageBlock[];
};

export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    id: 'product-launch',
    title: 'Product launch funnel',
    description: 'A hero-led landing page with checkout and urgency.',
    blocks: [
      buildBlock('hero', null, 0, {
        title: 'Launch your next offer in minutes',
        subtitle: 'Create a high-converting page and start selling fast.',
        ctaText: 'Start selling',
        ctaUrl: '/checkout',
      }),
      buildBlock('countdown', null, 1, {
        title: 'Offer expires soon',
        subtitle: 'Only a few spots remain for this launch special.',
      }),
      buildBlock('testimonials', null, 2),
      buildBlock('checkout', null, 3, {
        title: 'Secure checkout',
        description: 'Complete your purchase with confidence.',
        buttonText: 'Buy now',
        price: '$49',
      }),
    ],
  },
  {
    id: 'affiliate-invite',
    title: 'Affiliate invitation page',
    description: 'Promote your affiliate program and sign up new partners.',
    blocks: [
      buildBlock('hero', null, 0, {
        title: 'Earn recurring commissions today',
        subtitle: 'Invite partners to join your affiliate program and watch referrals grow.',
        ctaText: 'Join the program',
        ctaUrl: '/affiliate/sign-up',
      }),
      buildBlock('text', null, 1, {
        text: 'Share your link, attract new partners, and get paid for every sale they generate.',
      }),
      buildBlock('affiliate_signup', null, 2),
      buildBlock('referral_dashboard', null, 3),
    ],
  },
  {
    id: 'simple-landing',
    title: 'Simple landing page',
    description: 'A clean hero section followed by a strong call to action.',
    blocks: [
      buildBlock('hero', null, 0, {
        title: 'Build a page that converts',
        subtitle: 'Perfect for early-stage offers and fast launches.',
        ctaText: 'Create my page',
        ctaUrl: '/get-started',
      }),
      buildBlock('cta', null, 1),
      buildBlock('text', null, 2, {
        text: 'Use this page to quickly launch campaigns, collect leads, or sell digital products.',
      }),
    ],
  },
];

export function getTemplateById(id: string) {
  return FUNNEL_TEMPLATES.find((template) => template.id === id);
}
