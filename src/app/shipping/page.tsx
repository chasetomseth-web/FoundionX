import { Metadata } from 'next';
import ShippingPageContent from './components/ShippingPageContent';

export const metadata: Metadata = {
  title: 'Shipping — wiastro',
};

export default function ShippingPage() {
  return <ShippingPageContent />;
}
