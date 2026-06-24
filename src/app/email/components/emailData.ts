export interface EmailCampaign {
  id: string;
  name: string;
  type: 'broadcast' | 'automation' | 'transactional';
  trigger: string;
  status: 'live' | 'sent' | 'draft' | 'paused';
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  revenue: number;
  lastSent: string | null;
  createdAt: string;
}

export interface EmailContact {
  id: string;
  email: string;
  name: string;
  tags: string[];
  status: 'subscribed' | 'unsubscribed' | 'bounced';
  lastActivity: string;
}

export const mockEmailCampaigns: EmailCampaign[] = [
  {
    id: 'em-001',
    name: 'May Flash Sale — 24h Offer',
    type: 'broadcast',
    trigger: 'Manual send',
    status: 'sent',
    sent: 8420,
    delivered: 8310,
    opened: 4012,
    clicked: 892,
    unsubscribed: 14,
    revenue: 12840,
    lastSent: '2026-05-20T10:00:00Z',
    createdAt: '2026-05-19T14:00:00Z',
  },
  {
    id: 'em-002',
    name: 'Abandoned Cart Recovery — Seq 1',
    type: 'automation',
    trigger: 'Cart abandoned > 1 hour',
    status: 'live',
    sent: 1204,
    delivered: 1196,
    opened: 712,
    clicked: 289,
    unsubscribed: 3,
    revenue: 8420,
    lastSent: '2026-05-22T12:30:00Z',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'em-003',
    name: 'Post-Purchase Follow-Up',
    type: 'automation',
    trigger: 'Order completed',
    status: 'live',
    sent: 3841,
    delivered: 3809,
    opened: 2104,
    clicked: 634,
    unsubscribed: 22,
    revenue: 6200,
    lastSent: '2026-05-22T13:00:00Z',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'em-004',
    name: 'Affiliate Welcome Sequence',
    type: 'automation',
    trigger: 'Affiliate signup',
    status: 'live',
    sent: 312,
    delivered: 310,
    opened: 228,
    clicked: 145,
    unsubscribed: 1,
    revenue: 0,
    lastSent: '2026-05-22T09:00:00Z',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'em-005',
    name: 'Subscription Renewal Reminder',
    type: 'transactional',
    trigger: '7 days before renewal',
    status: 'live',
    sent: 542,
    delivered: 541,
    opened: 398,
    clicked: 201,
    unsubscribed: 0,
    revenue: 4200,
    lastSent: '2026-05-22T08:00:00Z',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'em-006',
    name: 'Failed Payment Recovery',
    type: 'automation',
    trigger: 'Payment failed',
    status: 'live',
    sent: 89,
    delivered: 88,
    opened: 61,
    clicked: 34,
    unsubscribed: 0,
    revenue: 3100,
    lastSent: '2026-05-22T10:00:00Z',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'em-007',
    name: 'Re-engagement — 60 Day Inactive',
    type: 'automation',
    trigger: 'No activity > 60 days',
    status: 'paused',
    sent: 2100,
    delivered: 2077,
    opened: 621,
    clicked: 98,
    unsubscribed: 41,
    revenue: 1800,
    lastSent: '2026-05-10T10:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'em-008',
    name: 'June Newsletter — Draft',
    type: 'broadcast',
    trigger: 'Manual send',
    status: 'draft',
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
    revenue: 0,
    lastSent: null,
    createdAt: '2026-05-22T11:00:00Z',
  },
];
