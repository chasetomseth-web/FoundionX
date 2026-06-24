'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface LiveEmailCampaign {
  id: string;
  name: string;
  subject?: string | null;
  type: string;
  status: string;
  trigger?: string | null;
  brevoCampaignId?: number | null;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  revenue?: number | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface EmailCampaignsResponse {
  campaigns: LiveEmailCampaign[];
}

export interface EmailKPIs {
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalRevenue: number;
  liveCount: number;
}

async function fetchEmailCampaigns(): Promise<EmailCampaignsResponse> {
  const res = await fetch('/api/email/campaigns');
  if (!res.ok) throw new Error('Failed to fetch email campaigns');
  return res.json();
}

async function triggerEmail(data: { type: string; customerId?: string; orderId?: string }): Promise<void> {
  const res = await fetch('/api/email/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to trigger email');
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ['email-campaigns'],
    queryFn: fetchEmailCampaigns,
    refetchInterval: 5 * 60 * 1000,
    select: (data) => {
      const campaigns = data.campaigns ?? [];
      const totalSent = campaigns.reduce((s, c) => s + (c.recipientCount ?? 0), 0);
      const totalOpened = campaigns.reduce((s, c) => s + (c.openCount ?? 0), 0);
      const totalClicked = campaigns.reduce((s, c) => s + (c.clickCount ?? 0), 0);
      const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0);
      const liveCount = campaigns.filter((c) => c.status === 'live' || c.status === 'active').length;

      const kpis: EmailKPIs = {
        totalSent,
        avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        avgClickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        totalRevenue,
        liveCount,
      };

      return { campaigns, kpis };
    },
  });
}

export function useTriggerEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });
}
