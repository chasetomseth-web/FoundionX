export interface Subscription {
  id: string;
  customer: { name: string; email: string };
  plan: string;
  amount: number;
  interval: 'monthly' | 'annual';
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  nextBillingDate: string;
  startDate: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  failedAttempts: number;
  totalPaid: number;
  canceledAt: string | null;
}

export const mockSubscriptions: Subscription[] = [
  {
    id: 'sub-001',
    customer: { name: 'Priya Mehta', email: 'priya.mehta@gmail.com' },
    plan: 'Premium Membership',
    amount: 49.0,
    interval: 'monthly',
    status: 'active',
    nextBillingDate: '2026-06-22T00:00:00Z',
    startDate: '2026-01-22T00:00:00Z',
    stripeSubscriptionId: 'sub_1Nk4j2A4eIgYh0kZ',
    stripeCustomerId: 'cus_Nk4j2A4eIgYh0kZ',
    failedAttempts: 0,
    totalPaid: 245.0,
    canceledAt: null,
  },
  {
    id: 'sub-002',
    customer: { name: 'Jordan Wells', email: 'j.wells@outlook.com' },
    plan: 'Premium Membership',
    amount: 49.0,
    interval: 'monthly',
    status: 'active',
    nextBillingDate: '2026-06-08T00:00:00Z',
    startDate: '2026-02-08T00:00:00Z',
    stripeSubscriptionId: 'sub_1Nk4j3B5fJhZi1lA',
    stripeCustomerId: 'cus_Nk4j3B5fJhZi1lA',
    failedAttempts: 0,
    totalPaid: 196.0,
    canceledAt: null,
  },
  {
    id: 'sub-003',
    customer: { name: 'Lena Hoffmann', email: 'lena.h@berlinstyle.de' },
    plan: 'Essential Plan',
    amount: 39.0,
    interval: 'monthly',
    status: 'active',
    nextBillingDate: '2026-06-01T00:00:00Z',
    startDate: '2026-03-01T00:00:00Z',
    stripeSubscriptionId: 'sub_1Nk4n7F9jNlDm5pE',
    stripeCustomerId: 'cus_Nk4n7F9jNlDm5pE',
    failedAttempts: 0,
    totalPaid: 117.0,
    canceledAt: null,
  },
  {
    id: 'sub-004',
    customer: { name: 'Ethan Nakamura', email: 'ethan.n@techcorp.io' },
    plan: 'Pro Plan Annual',
    amount: 299.0,
    interval: 'annual',
    status: 'past_due',
    nextBillingDate: '2026-05-22T00:00:00Z',
    startDate: '2026-05-22T00:00:00Z',
    stripeSubscriptionId: 'sub_1Nk4l5D7hLjBk3nC',
    stripeCustomerId: 'cus_Nk4l5D7hLjBk3nC',
    failedAttempts: 2,
    totalPaid: 0.0,
    canceledAt: null,
  },
  {
    id: 'sub-005',
    customer: { name: 'Isabelle Fontaine', email: 'isabelle.f@parismode.fr' },
    plan: 'Premium Membership',
    amount: 49.0,
    interval: 'monthly',
    status: 'active',
    nextBillingDate: '2026-06-28T00:00:00Z',
    startDate: '2026-02-28T00:00:00Z',
    stripeSubscriptionId: 'sub_1Nk4q0I2mQoGp8sH',
    stripeCustomerId: 'cus_Nk4q0I2mQoGp8sH',
    failedAttempts: 0,
    totalPaid: 147.0,
    canceledAt: null,
  },
  {
    id: 'sub-006',
    customer: { name: 'Amara Osei', email: 'amara.osei@gmail.com' },
    plan: 'Essential Plan',
    amount: 39.0,
    interval: 'monthly',
    status: 'active',
    nextBillingDate: '2026-06-05T00:00:00Z',
    startDate: '2026-01-05T00:00:00Z',
    stripeSubscriptionId: 'sub_1Nk4m6E8iMkCl4oD',
    stripeCustomerId: 'cus_Nk4m6E8iMkCl4oD',
    failedAttempts: 0,
    totalPaid: 195.0,
    canceledAt: null,
  },
  {
    id: 'sub-007',
    customer: { name: 'Devon Clarke', email: 'devon.c@northernco.ca' },
    plan: 'Pro Plan Annual',
    amount: 299.0,
    interval: 'annual',
    status: 'past_due',
    nextBillingDate: '2026-05-22T00:00:00Z',
    startDate: '2026-05-22T00:00:00Z',
    stripeSubscriptionId: 'sub_1Nk4r1J3nRpHq9tI',
    stripeCustomerId: 'cus_Nk4r1J3nRpHq9tI',
    failedAttempts: 1,
    totalPaid: 0.0,
    canceledAt: null,
  },
];
