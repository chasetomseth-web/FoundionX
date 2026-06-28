import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import QueryProvider from '@/providers/QueryProvider';
import CartProviderWrapper from '@/providers/CartProviderWrapper';
import { AuthProvider } from '@/contexts/AuthContext';
import CookieConsentBanner from '@/components/CookieConsentBanner';


const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'wiastro — All-in-One E-commerce Operating System',
  description:
    'wiastro helps online store owners manage orders, affiliates, subscriptions, and email marketing from one fast, clean dashboard.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <AuthProvider>
          <QueryProvider>
            <CartProviderWrapper>
              {children}
            </CartProviderWrapper>
          </QueryProvider>
        </AuthProvider>
        <Toaster position="bottom-right" richColors closeButton />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
