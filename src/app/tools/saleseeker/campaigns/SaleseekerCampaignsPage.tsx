'use client';

import React, { useEffect, useState } from 'react';
import { Filter, FolderOpen } from 'lucide-react';
import type { SaleseekerCampaign } from '../types';

export default function SaleseekerCampaignsPage() {
  const [campaigns, setCampaigns] = useState<SaleseekerCampaign[]>([]);
  const [tagFilter, setTagFilter] = useState('');
  const [nicheFilter, setNicheFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/saleseeker/campaigns')
      .then((res) => res.json())
      .then((data: { campaigns: SaleseekerCampaign[] }) => {
        setCampaigns(data.campaigns ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = campaigns.filter((campaign) => {
    const tagMatch = !tagFilter || campaign.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
    const nicheMatch = !nicheFilter || (campaign.niche ?? '').toLowerCase().includes(nicheFilter.toLowerCase());
    return tagMatch && nicheMatch;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderOpen size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-700 text-foreground">Saved Saleseeker Campaigns</h1>
              <p className="text-sm text-muted-foreground">Filter saved campaigns by tag or niche and reopen results.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Filter size={16} />
              <input
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
                placeholder="Filter by tag"
                className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Filter size={16} />
              <input
                value={nicheFilter}
                onChange={(event) => setNicheFilter(event.target.value)}
                placeholder="Filter by niche"
                className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading campaigns...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No saved campaigns match the current filters.
            </div>
          ) : (
            filtered.map((campaign) => (
              <section key={campaign.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-700 text-foreground">{campaign.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {campaign.niche ? `Niche: ${campaign.niche}` : 'No niche'} · {new Date(campaign.created_at).toLocaleString()}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.tags.length > 0 ? (
                        campaign.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-600 text-primary">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No tags</span>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-600 text-muted-foreground">
                    {campaign.leads.length} leads
                  </span>
                </div>

                <div className="mt-5 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs font-600 uppercase tracking-widest text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Business</th>
                        <th className="px-4 py-3">Emails</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaign.leads.map((lead) => (
                        <tr key={lead.id} className="border-t border-border/70">
                          <td className="px-4 py-3 font-600 text-foreground">{lead.business_name}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {lead.emails.map((email) => (
                                <a key={email} href={`mailto:${email}`} className="text-primary underline-offset-4 hover:underline">
                                  {email}
                                </a>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-foreground">{lead.phone ?? '—'}</td>
                          <td className="px-4 py-3 text-foreground">{lead.address ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
