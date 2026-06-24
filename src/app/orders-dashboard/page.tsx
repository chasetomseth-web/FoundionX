import React from 'react';
import AppLayout from '@/components/AppLayout';
import OrdersPageContent from './components/OrdersPageContent';

export default function OrdersDashboardPage() {
  return (
    <AppLayout>
      <OrdersPageContent />
    </AppLayout>
  );
}