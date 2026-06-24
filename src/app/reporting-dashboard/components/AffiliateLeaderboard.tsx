import React from 'react';
import Badge from '@/components/ui/Badge';
import { affiliateLeaderboard } from './reportingData';
import { ExternalLink } from 'lucide-react';

export default function AffiliateLeaderboard() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-600 text-foreground">Affiliate Leaderboard</h3>
          <p className="text-xs text-muted-foreground mt-0.5">GoAffPro — last 30 days performance</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-primary font-500 hover:underline">
          Manage affiliates <ExternalLink size={12} />
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Affiliate</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Ref Code</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Clicks</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Conv.</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Conv. Rate</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">GMV</th>
              <th className="px-4 py-3 text-right text-xs font-600 uppercase tracking-wider text-muted-foreground">Commission</th>
              <th className="px-4 py-3 text-left text-xs font-600 uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {affiliateLeaderboard?.map((aff, idx) => (
              <tr key={aff?.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-700 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="font-500 text-foreground">{aff?.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-muted-foreground">{aff?.code}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-500">{aff?.clicks?.toLocaleString('en-US')}</td>
                <td className="px-4 py-3 text-right tabular-nums font-500">{aff?.conversions}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-600 tabular-nums ${aff?.convRate >= 5 ? 'text-success' : aff?.convRate >= 4 ? 'text-foreground' : 'text-warning'}`}>
                    {aff?.convRate?.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-600">${aff?.gmv?.toLocaleString('en-US')}</td>
                <td className="px-4 py-3 text-right tabular-nums font-600 text-success">${aff?.commission?.toLocaleString('en-US')}</td>
                <td className="px-4 py-3">
                  <Badge variant={aff?.status === 'active' ? 'success' : 'muted'} dot>
                    {aff?.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 border-t border-border">
              <td colSpan={2} className="px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wider">Totals</td>
              <td className="px-4 py-3 text-right text-sm font-700 tabular-nums">
                {affiliateLeaderboard?.reduce((s, a) => s + a?.clicks, 0)?.toLocaleString('en-US')}
              </td>
              <td className="px-4 py-3 text-right text-sm font-700 tabular-nums">
                {affiliateLeaderboard?.reduce((s, a) => s + a?.conversions, 0)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-700 tabular-nums">
                {(affiliateLeaderboard?.reduce((s, a) => s + a?.conversions, 0) / affiliateLeaderboard?.reduce((s, a) => s + a?.clicks, 0) * 100)?.toFixed(2)}%
              </td>
              <td className="px-4 py-3 text-right text-sm font-700 tabular-nums">
                ${affiliateLeaderboard?.reduce((s, a) => s + a?.gmv, 0)?.toLocaleString('en-US')}
              </td>
              <td className="px-4 py-3 text-right text-sm font-700 tabular-nums text-success">
                ${affiliateLeaderboard?.reduce((s, a) => s + a?.commission, 0)?.toLocaleString('en-US')}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}