'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Target, Loader2, Download, Save, Tag as TagIcon } from 'lucide-react';
import type {
  GenerateSaleseekerInput,
  SaleseekerCampaign,
  SaleseekerFilters,
  SaleseekerLead,
  SaleseekerResultsResponse,
  SaleseekerUiStatus,
} from './types';

const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'Brazil'];

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const cityData: Record<string, Record<string, string[]>> = {
  'United States': {
    CA: ['Los Angeles', 'San Diego', 'San Francisco', 'San Jose', 'Sacramento'],
    NY: ['New York', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
    TX: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
    FL: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
    IL: ['Chicago', 'Naperville', 'Aurora', 'Rockford', 'Joliet'],
    WA: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue'],
  },
  Canada: {
    ON: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London'],
    BC: ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond'],
    QC: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil'],
  },
  'United Kingdom': {
    England: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol'],
    Scotland: ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee'],
  },
  Australia: {
    NSW: ['Sydney', 'Newcastle', 'Wollongong'],
    VIC: ['Melbourne', 'Geelong', 'Ballarat'],
    QLD: ['Brisbane', 'Gold Coast', 'Cairns'],
  },
  Germany: {
    BE: ['Berlin'],
    BY: ['Munich', 'Nuremberg', 'Augsburg'],
    HH: ['Hamburg'],
  },
  France: {
    IDF: ['Paris', 'Versailles', 'Boulogne-Billancourt'],
    PACA: ['Marseille', 'Nice', 'Toulon'],
  },
  Japan: {
    Tokyo: ['Tokyo', 'Shibuya', 'Shinjuku'],
    Osaka: ['Osaka', 'Sakai'],
  },
  Brazil: {
    SP: ['São Paulo', 'Campinas', 'Santos'],
    RJ: ['Rio de Janeiro', 'Niterói'],
  },
};

function statusLabel(status: SaleseekerUiStatus) {
  if (status === 'searching') return 'Searching';
  if (status === 'scraping') return 'Scraping';
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  return 'Idle';
}

function statusClass(status: SaleseekerUiStatus) {
  if (status === 'completed') return 'bg-success-bg text-success border-success/20';
  if (status === 'failed') return 'bg-danger-bg text-danger border-danger/20';
  if (status === 'searching' || status === 'scraping') return 'bg-warning-bg text-warning border-warning/20';
  return 'bg-muted text-muted-foreground border-border';
}

function exportCsv(leads: SaleseekerLead[]) {
  const rows = [
    ['Business Name', 'Website', 'Emails', 'Phone', 'Address', 'City', 'State', 'Owner', 'Tags'],
    ...leads.map((lead) => [
      lead.business_name,
      lead.website ?? '',
      lead.emails.join('; '),
      lead.phone ?? '',
      lead.address ?? '',
      lead.city ?? '',
      lead.state ?? '',
      lead.owner_name ?? '',
      lead.tags.join('; '),
    ]),
  ];

  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `saleseeker-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SaleseekerPage() {
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('United States');
  const [state, setState] = useState('CA');
  const [city, setCity] = useState('Los Angeles');
  const [filters, setFilters] = useState<SaleseekerFilters>({ hasWebsite: true, hasPhone: false });
  const [status, setStatus] = useState<SaleseekerUiStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<SaleseekerLead[]>([]);
  const [campaigns, setCampaigns] = useState<SaleseekerCampaign[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [campaignTags, setCampaignTags] = useState('');
  const [rowTagDrafts, setRowTagDrafts] = useState<Record<string, string>>({});
  const [taggingLeadId, setTaggingLeadId] = useState<string | null>(null);

  const states = useMemo(() => Object.keys(cityData[country] ?? {}), [country]);
  const cities = useMemo(() => cityData[country]?.[state] ?? [], [country, state]);

  useEffect(() => {
    const availableStates = Object.keys(cityData[country] ?? {});
    if (!availableStates.includes(state)) {
      const next = availableStates[0] ?? '';
      setState(next);
      setCity(cityData[country]?.[next]?.[0] ?? '');
      return;
    }
    const availableCities = cityData[country]?.[state] ?? [];
    if (!availableCities.includes(city)) {
      setCity(availableCities[0] ?? '');
    }
  }, [country, state, city]);

  useEffect(() => {
    if (status === 'idle' || status === 'completed' || status === 'failed') return;
    const interval = window.setInterval(async () => {
      const res = await fetch('/api/saleseeker/results');
      if (!res.ok) return;
      const data = (await res.json()) as SaleseekerResultsResponse;
      setLeads(data.leads);
      setCampaigns(data.campaigns);
      setStatus(data.status);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [status]);

  const selectedLeadIds = useMemo(() => leads.map((lead) => lead.id), [leads]);

  const generateLeads = async () => {
    setError(null);
    if (!niche.trim() || !city.trim()) {
      setError('Niche and city are required.');
      return;
    }

    setStatus('searching');
    const payload: GenerateSaleseekerInput = {
      niche: niche.trim(),
      country,
      state,
      city,
      filters,
    };

    const res = await fetch('/api/saleseeker/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus('failed');
      setError(data.error ?? 'Unable to generate leads.');
      return;
    }

    setStatus(data.status ?? 'searching');
    setLeads(data.leads ?? []);
    setCampaigns(data.campaigns ?? []);
  };

  const addTagToLead = async (leadId: string) => {
    const tag = rowTagDrafts[leadId]?.trim();
    if (!tag) return;

    setTaggingLeadId(leadId);
    const res = await fetch(`/api/saleseeker/leads/${leadId}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: [tag] }),
    });

    if (res.ok) {
      const updated = (await res.json()) as SaleseekerLead;
      setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
      setRowTagDrafts((current) => ({ ...current, [leadId]: '' }));
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Unable to tag lead.');
    }
    setTaggingLeadId(null);
  };

  const saveCampaign = async () => {
    if (!campaignName.trim() || selectedLeadIds.length === 0) return;
    const tags = campaignTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const res = await fetch('/api/saleseeker/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: campaignName.trim(), leadIds: selectedLeadIds, tags, niche }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Unable to save campaign.');
      return;
    }

    const campaign = (await res.json()) as SaleseekerCampaign;
    setCampaigns((current) => [campaign, ...current.filter((item) => item.id !== campaign.id)]);
    setCampaignName('');
    setCampaignTags('');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-700 text-foreground">Saleseeker</h1>
                  <p className="text-sm text-muted-foreground">Find local businesses, enrich websites, and save valid email leads.</p>
                </div>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-600 ${statusClass(status)}`}>
              {status === 'searching' || status === 'scraping' ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              {statusLabel(status)}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm">
              <span className="font-600 text-foreground">Niche</span>
              <input
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                placeholder="spa, gym, dentist, roofing"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-600 text-foreground">Country</span>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                {countries.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-600 text-foreground">State</span>
              <select
                value={state}
                onChange={(event) => setState(event.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                {states.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-600 text-foreground">City</span>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                {cities.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={filters.hasWebsite}
                onChange={(event) => setFilters((current) => ({ ...current, hasWebsite: event.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Has Website
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={filters.hasPhone}
                onChange={(event) => setFilters((current) => ({ ...current, hasPhone: event.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Has Phone
            </label>
            <button
              onClick={generateLeads}
              disabled={status === 'searching' || status === 'scraping'}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-600 text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate Leads
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">{error}</div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-700 text-foreground">Valid Leads</h2>
                <p className="text-sm text-muted-foreground">Only businesses with at least one verified email are shown.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => exportCsv(leads)}
                  disabled={leads.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-600 text-foreground transition hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button
                  onClick={saveCampaign}
                  disabled={leads.length === 0 || !campaignName.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-sm font-600 text-success-foreground transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  Save to Campaign
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs font-600 uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Business Name</th>
                    <th className="px-4 py-3">Website</th>
                    <th className="px-4 py-3">Emails</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {status === 'idle' ? 'Run a search to find local leads.' : 'No valid leads have been enriched yet.'}
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="border-t border-border/70">
                        <td className="px-4 py-3 align-top">
                          <div className="font-600 text-foreground">{lead.business_name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{[lead.city, lead.state].filter(Boolean).join(', ')}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {lead.website ? (
                            <a href={lead.website} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                              {lead.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {lead.emails.map((email) => (
                              <a key={email} href={`mailto:${email}`} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/15">
                                {email}
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-foreground">{lead.phone ?? '—'}</td>
                        <td className="px-4 py-3 align-top text-foreground">{lead.address ?? '—'}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex max-w-[180px] flex-wrap gap-1">
                            {lead.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={rowTagDrafts[lead.id] ?? ''}
                              onChange={(event) => setRowTagDrafts((current) => ({ ...current, [lead.id]: event.target.value }))}
                              placeholder="Add tag"
                              className="min-w-0 flex-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                            <button
                              onClick={() => addTagToLead(lead.id)}
                              disabled={taggingLeadId === lead.id}
                              className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-600 text-foreground disabled:opacity-50"
                            >
                              {taggingLeadId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TagIcon size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-lg font-700 text-foreground">Save Campaign</h2>
              <div className="mt-4 space-y-3">
                <label className="space-y-2 text-sm">
                  <span className="font-600 text-foreground">Campaign name</span>
                  <input
                    value={campaignName}
                    onChange={(event) => setCampaignName(event.target.value)}
                    placeholder="June spa outreach"
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-600 text-foreground">Campaign tags</span>
                  <input
                    value={campaignTags}
                    onChange={(event) => setCampaignTags(event.target.value)}
                    placeholder="high intent, spa, premium"
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <p className="text-xs text-muted-foreground">{selectedLeadIds.length} leads ready to save.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-700 text-foreground">Saved Campaigns</h2>
                <a href="/tools/saleseeker/campaigns" className="text-xs font-600 text-primary hover:underline">View all</a>
              </div>
              <div className="mt-4 space-y-3">
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No campaigns saved yet.</p>
                ) : (
                  campaigns.slice(0, 5).map((campaign) => (
                    <a key={campaign.id} href="/tools/saleseeker/campaigns" className="block rounded-xl border border-border bg-muted/40 p-3 transition hover:bg-muted">
                      <div className="font-600 text-foreground">{campaign.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{campaign.leads.length} leads · {campaign.tags.join(', ') || 'No tags'}</div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
