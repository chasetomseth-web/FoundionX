import type { PageBlock, BlockType } from '../types';

export type BlockDefinition = {
  type: BlockType;
  label: string;
  category: string;
  defaultProps: PageBlock['props'];
  defaultStyle: PageBlock['style'];
  acceptsChildren: boolean;
  allowedChildren: BlockType[];
};

export const BLOCK_DEFAULTS: Record<BlockType, Pick<BlockDefinition, 'defaultProps' | 'defaultStyle'>> = {
  section: {
    defaultProps: {},
    defaultStyle: {
      padding: '2rem 1rem',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      align: 'center',
    },
  },
  container: {
    defaultProps: {},
    defaultStyle: {
      padding: '1rem',
      backgroundColor: 'transparent',
      width: '100%',
      maxWidth: '1200px',
    },
  },
  row: {
    defaultProps: {},
    defaultStyle: {
      display: 'flex',
      flexDirection: 'row',
      gap: '1rem',
      width: '100%',
    },
  },
  column: {
    defaultProps: {},
    defaultStyle: {
      flex: '1',
      minWidth: '0',
      width: '100%',
    },
  },
  hero: {
    defaultProps: {
      title: 'Launch a high-converting offer in minutes',
      subtitle: 'Build pages, collect payments, and turn traffic into revenue without code.',
      ctaText: 'Get Started',
      ctaUrl: '/',
      eyebrow: 'New',
    },
    defaultStyle: {
      padding: '3rem 1rem',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      align: 'center',
      fontSize: '1rem',
    },
  },
  navbar: {
    defaultProps: {
      logoText: 'Brand',
      links: ['Features', 'Pricing', 'FAQ'],
    },
    defaultStyle: {
      padding: '1rem 1.5rem',
      backgroundColor: '#ffffff',
      textColor: '#111827',
    },
  },
  text: {
    defaultProps: {
      text: 'Add compelling copy that explains your value proposition and encourages visitors to act.',
    },
    defaultStyle: {
      padding: '1rem',
      backgroundColor: 'transparent',
      textColor: '#111827',
      fontSize: '1rem',
      align: 'left',
    },
  },
  image: {
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80',
      alt: 'Marketing image',
    },
    defaultStyle: {
      padding: '1rem',
      width: '100%',
      maxWidth: '720px',
      borderRadius: '0.75rem',
    },
  },
  countdown: {
    defaultProps: {
      title: 'Offer expires soon',
      subtitle: 'Act now before it disappears.',
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#111827',
      textColor: '#ffffff',
      align: 'center',
      borderRadius: '1rem',
    },
  },
  cta: {
    defaultProps: {
      title: 'Ready to start?',
      description: 'Launch your first funnel in minutes with one-click publishing.',
      buttonText: 'Create my page',
      buttonUrl: '/',
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#2563eb',
      textColor: '#ffffff',
      align: 'center',
      borderRadius: '0.75rem',
    },
  },
  testimonials: {
    defaultProps: {
      testimonials: [
        { quote: 'Saved us hours every week.', author: 'A happy merchant' },
        { quote: 'Conversion improved immediately.', author: 'Growth lead' },
      ],
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#f9fafb',
      textColor: '#111827',
    },
  },
  checkout: {
    defaultProps: {
      title: 'Checkout now',
      description: 'Secure payment processing with a single click.',
      buttonText: 'Complete purchase',
      price: '$49',
      productId: 'product-001',
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#ecfdf5',
      textColor: '#065f46',
      borderRadius: '1rem',
      align: 'center',
    },
  },
  order_bump: {
    defaultProps: {
      title: 'Add this extra offer',
      description: 'A relevant upsell to increase average order value.',
      buttonText: 'Add to order',
      price: '$19',
    },
    defaultStyle: {
      padding: '1rem',
      backgroundColor: '#fef3c7',
      textColor: '#92400e',
      borderRadius: '1rem',
    },
  },
  upsell: {
    defaultProps: {
      title: 'One last thing...',
      description: 'Add this high-value add-on before your customer checks out.',
      buttonText: 'Accept offer',
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#eef2ff',
      textColor: '#4338ca',
      borderRadius: '1rem',
      align: 'center',
    },
  },
  affiliate: {
    defaultProps: {
      title: 'Become an affiliate',
      description: 'Earn recurring commissions for every referral.',
      ctaText: 'Join now',
      ctaUrl: '/affiliate',
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#f0f9ff',
      textColor: '#1d4ed8',
      borderRadius: '1rem',
      align: 'center',
    },
  },
  affiliate_signup: {
    defaultProps: {
      title: 'Partner with us',
      description: 'Share your affiliate link and earn revenue from every sale.',
      buttonText: 'Sign up',
      buttonUrl: '/affiliate/sign-up',
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#eff6ff',
      textColor: '#1d4ed8',
      borderRadius: '1rem',
    },
  },
  referral_dashboard: {
    defaultProps: {
      title: 'Your referrals',
      description: 'Track clicks, leads, and conversions from your network.',
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      borderRadius: '1rem',
      border: '1px solid #e5e7eb',
    },
  },
  html: {
    defaultProps: {
      html: '<div>Custom HTML block</div>',
    },
    defaultStyle: {
      padding: '1rem',
      backgroundColor: 'transparent',
    },
  },
  customer_login: {
    defaultProps: {
      title: 'Sign In',
      redirectAfterLogin: '/portal/dashboard',
    },
    defaultStyle: {
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      borderRadius: '1rem',
      border: '1px solid #e5e7eb',
      align: 'center',
    },
  },
  script: {
    defaultProps: {
      script: "console.log('Custom script running');",
    },
    defaultStyle: {
      padding: '1rem',
      backgroundColor: '#f8fafc',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
    },
  },
};
