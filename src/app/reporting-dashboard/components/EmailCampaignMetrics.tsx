import React from 'react';
import Badge from '@/components/ui/Badge';
import { emailCampaigns } from './reportingData';
import { Mail } from 'lucide-react';

const typeLabels: Record<string, string> = {
  broadcast: 'Broadcast',
  automation: 'Automation',
  transactional: 'Transactional',
};

const typeBadge: Record<string, 'primary' | 'info' | 'muted'> = {
  broadcast: 'primary',
  automation: 'info',
  transactional: 'muted',
};

const statusBadge: Record<string, 'success' | 'muted' | 'warning'> = {
  live: 'success',
  sent: 'muted',
  paused: 'warning',
};

function pct(a: number, b: number) {
  if (!b) return '0%';
  return `${((a / b) * 100).toFixed(1)}%`;
}

export default function EmailCampaignMetrics() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-600 text-foreground">Email Campaigns</h3>
            <p className="text-xs text-muted-foreground">Brevo — delivery, open &amp; click performance</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            {emailCampaigns.filter((e) => e.status === 'live').length} live
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
            {emailCampaigns.filter((e) => e.status === 'sent').length} sent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning inline-block" />
            {emailCampaigns.filter((e) => e.status === 'paused').length} paused
          </span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Campaign</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Sent</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Delivered</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Open Rate</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Click Rate</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Unsubs</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {emailCampaigns.map((campaign) => {
              const openRate = parseFloat(pct(campaign.opened, campaign.delivered));
              const clickRate = parseFloat(pct(campaign.clicked, campaign.delivered));
              return (
                <tr key={campaign.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-500 text-foreground">{campaign.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={typeBadge[campaign.type]}>{typeLabels[campaign.type]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-500">{campaign.sent.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm tabular-nums font-500">{campaign.delivered.toLocaleString('en-US')}</span>
                    <span className="text-xs text-muted-foreground ml-1">({pct(campaign.delivered, campaign.sent)})</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-600 tabular-nums ${openRate >= 40 ? 'text-success' : openRate >= 25 ? 'text-foreground' : 'text-warning'}`}>
                      {pct(campaign.opened, campaign.delivered)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-600 tabular-nums ${clickRate >= 10 ? 'text-success' : clickRate >= 5 ? 'text-foreground' : 'text-warning'}`}>
                      {pct(campaign.clicked, campaign.delivered)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm tabular-nums ${campaign.unsubscribed > 20 ? 'text-danger font-600' : 'text-muted-foreground'}`}>
                      {campaign.unsubscribed}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadge[campaign.status]} dot>{campaign.status}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}