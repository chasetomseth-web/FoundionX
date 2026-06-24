import { Prisma } from '@prisma/client';

export type BlockType =
  | 'section'
  | 'container'
  | 'row'
  | 'column'
  | 'hero'
  | 'text'
  | 'image'
  | 'countdown'
  | 'checkout'
  | 'affiliate'
  | 'html'
  | 'navbar'
  | 'cta'
  | 'testimonials'
  | 'order_bump'
  | 'upsell'
  | 'affiliate_signup'
  | 'referral_dashboard'
  | 'customer_login'
  | 'script';

export type JsonData = Prisma.JsonValue;

export type PageBlock = {
  id: string;
  type: BlockType;
  parentId: string | null;
  order: number;
  props: JsonData;
  style: JsonData;
  pageId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PageRecord = {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  status: string;
  metadata: JsonData;
  settings: JsonData;
  createdAt: string;
  updatedAt: string;
};
