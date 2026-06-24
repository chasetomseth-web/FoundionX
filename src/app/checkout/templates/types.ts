export type CheckoutTemplate = 'default' | 'minimal' | 'branded' | 'two-column' | 'funnel';

export interface CheckoutItem {
  name: string;
  price: number;
  quantity: number;
  productId?: string;
  offerId?: string;
  images?: string[];
}

export interface CheckoutTemplateProps {
  items: CheckoutItem[];
  subtotal: number;
  loading: boolean;
  error: string | null;
  onCheckout: () => void;
  couponCode: string;
  affiliateCode: string;
  storeId: string;
}