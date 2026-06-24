'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Globe, Trash2, Edit, Power, PowerOff, ExternalLink, AlertTriangle, X, Loader2, RefreshCw } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';

const API = '/api';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export default function SitesPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [manageDomainsId, setManageDomainsId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api('/sites').then(r => r.sites),
  });

  const createSite = useMutation({
    mutationFn: (vars: { name: string; slug: string; htmlContent: string }) =>
      api('/sites', { method: 'POST', body: JSON.stringify(vars) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sites'] }); setShowNew(false); },
  });

  const updateSite = useMutation({
    mutationFn: (vars: { id: string; name?: string; slug?: string; htmlContent?: string; isPublished?: boolean }) =>
      api(`/sites/${vars.id}`, { method: 'PATCH', body: JSON.stringify(vars) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sites'] }); setEditingId(null); },
  });

  const deleteSite = useMutation({
    mutationFn: (id: string) =>
      api(`/sites/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sites'] }); setDeletingId(null); },
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DNS & Sites</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage published sites and custom domains</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> New Site
        </button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {!isLoading && (!data || data.length === 0) && (
        <div className="border border-border rounded-xl p-8 text-center">
          <Globe size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No sites yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first site to start publishing content under a custom domain.
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus size={16} /> Create Site
          </button>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((site: any) => (
            <div key={site.id} className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{site.name}</h3>
                    <span className="text-xs text-muted-foreground font-mono">/{site.slug}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      site.isPublished
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {site.isPublished ? <Power size={12} /> : <PowerOff size={12} />}
                      {site.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {site._count?.domains ?? site.domains?.length ?? 0} domain(s)
                    </span>
                  </div>
                  {site.isPublished && (site._count?.domains ?? site.domains?.length ?? 0) === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Preview: <code className="bg-muted px-1 rounded">http://localhost:4028/render/{site.slug}</code>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingId(site.id)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => updateSite.mutate({ id: site.id, isPublished: !site.isPublished })}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={site.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {site.isPublished ? <PowerOff size={16} /> : <Power size={16} />}
                  </button>
                  <button
                    onClick={() => setManageDomainsId(site.id)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Manage Domains"
                  >
                    <Globe size={16} />
                  </button>
                  <button
                    onClick={() => setDeletingId(site.id)}
                    className="p-2 rounded-lg hover:bg-danger-bg text-danger transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <SiteForm
          onSubmit={(vars) => createSite.mutate(vars)}
          onClose={() => setShowNew(false)}
          isLoading={createSite.isPending}
        />
      )}

      {editingId && (
        <SiteForm
          site={data?.find((s: any) => s.id === editingId)}
          onSubmit={(vars) => updateSite.mutate({ ...vars, id: editingId })}
          onClose={() => setEditingId(null)}
          isLoading={updateSite.isPending}
        />
      )}

      {deletingId && (
        <ConfirmDelete
          siteName={data?.find((s: any) => s.id === deletingId)?.name}
          domainCount={data?.find((s: any) => s.id === deletingId)?._count?.domains ?? 0}
          onConfirm={() => deleteSite.mutate(deletingId)}
          onClose={() => setDeletingId(null)}
          isLoading={deleteSite.isPending}
        />
      )}

      {manageDomainsId && (
        <DomainManager
          siteId={manageDomainsId}
          domains={data?.find((s: any) => s.id === manageDomainsId)?.domains ?? []}
          onClose={() => setManageDomainsId(null)}
        />
      )}
    </div>
  );
}

function SiteForm({ site, onSubmit, onClose, isLoading }: {
  site?: any;
  onSubmit: (vars: { name: string; slug: string; htmlContent: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(site?.name ?? '');
  const [slug, setSlug] = useState(site?.slug ?? '');
  const [htmlContent, setHtmlContent] = useState(site?.htmlContent ?? '');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!site) setSlug(slugify(val));
  };

  const canSubmit = name.trim() && slug.trim() && !isLoading;

  return (
    <Modal open onClose={onClose} title={site ? 'Edit Site' : 'New Site'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground"
            placeholder="My Site"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground font-mono text-sm"
            placeholder="my-site"
          />
          <p className="text-xs text-muted-foreground mt-1">Used in the preview URL</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">HTML Content</label>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground font-mono text-sm h-48"
            placeholder="<h1>Hello World</h1>"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">Cancel</button>
          <button
            onClick={() => canSubmit && onSubmit({ name: name.trim(), slug: slug.trim(), htmlContent })}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Saving...' : site ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmDelete({ siteName, domainCount, onConfirm, onClose, isLoading }: {
  siteName?: string;
  domainCount: number;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  return (
    <Modal open onClose={onClose} title="Delete Site">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-danger-bg rounded-lg">
          <AlertTriangle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Are you sure you want to delete <strong>{siteName}</strong>?</p>
            {domainCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                This site has {domainCount} connected domain(s). All domains will also be removed from Vercel.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-danger text-danger-foreground hover:bg-danger/90 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Deleting...' : 'Delete Site'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DomainManager({ siteId, domains, onClose }: {
  siteId: string;
  domains: any[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [newHostname, setNewHostname] = useState('');
  const [adding, setAdding] = useState(false);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [dnsInstructionState, setDnsInstructionState] = useState<Record<string, any | null>>({});
  const intervalsRef = React.useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: () => api('/sites').then(r => r.sites),
  });
  const site = sitesData?.find((s: any) => s.id === siteId);

  const dnsInstructions = useMutation({
    mutationFn: (id: string) => api(`/domains/${id}/dns-instructions`),
    onSuccess: (data, id) => {
      setDnsInstructionState(prev => ({ ...prev, [id]: data.dnsInstructions }));
    },
    onError: (_, id) => {
      setDnsInstructionState(prev => ({ ...prev, [id]: null }));
    },
  });

  const addDomain = useMutation({
    mutationFn: (hostname: string) => api('/domains', { method: 'POST', body: JSON.stringify({ siteId, hostname }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      setNewHostname('');
      if (data?.domain?.id) dnsInstructions.mutate(data.domain.id);
    },
  });

  const verifyDomain = useMutation({
    mutationFn: (id: string) => api(`/domains/${id}/verify`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sites'] }); },
  });

  const removeDomain = useMutation({
    mutationFn: (id: string) => api(`/domains/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sites'] }); },
  });

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((timer) => clearInterval(timer));
      intervalsRef.current.clear();
    };
  }, []);

  const handleAdd = () => {
    if (!newHostname.trim()) return;
    setAdding(true);
    addDomain.mutate(newHostname.trim(), {
      onSettled: () => setAdding(false),
    });
  };

  const handleVerify = (id: string) => {
    verifyDomain.mutate(id);
  };

  const handleDnsInstructions = (id: string) => {
    dnsInstructions.mutate(id);
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this domain? It will be removed from Vercel and this local record will be deleted.')) {
      removeDomain.mutate(id);
    }
  };

  const startPolling = (id: string) => {
    setPollingIds(prev => new Set(prev).add(id));
    const interval = setInterval(() => {
      verifyDomain.mutate(id, {
        onSuccess: (data) => {
          const d = data.domain;
          if (d.verificationState === 'verified' || d.verificationState === 'failed') {
            clearInterval(interval);
            intervalsRef.current.delete(id);
            setPollingIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        },
        onError: () => {
          clearInterval(interval);
          intervalsRef.current.delete(id);
          setPollingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      });
    }, 5000);

    intervalsRef.current.set(id, interval);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      intervalsRef.current.delete(id);
      setPollingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 120000);

    intervalsRef.current.set(`${id}-timeout`, timeout);
  };

  return (
    <Modal open onClose={onClose} title={`Manage Domains — ${site?.name}`}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={newHostname}
            onChange={(e) => setNewHostname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
            placeholder="example.com"
            disabled={adding}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newHostname.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>

        {domains.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No domains connected yet.</p>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {domains.map((d: any) => (
            <div key={d.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{d.hostname}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge label="Verification" state={d.verificationState} />
                    <StatusBadge label="SSL" state={d.sslState} />
                    {d.sslState === 'pending' && d.verificationState === 'verified' && (
                      <span className="text-xs text-muted-foreground italic">
                        (expected with Cloudflare proxy)
                      </span>
                    )}
                  </div>
                  {d.errorMessage && (
                    <p className="text-xs text-danger mt-1">{d.errorMessage}</p>
                  )}
                  {dnsInstructionState[d.id] !== undefined && (
                    <DnsInstructions
                      instructions={dnsInstructionState[d.id]}
                      onRetry={() => handleDnsInstructions(d.id)}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {d.verificationState === 'pending' && !pollingIds.has(d.id) && (
                    <button
                      onClick={() => startPolling(d.id)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Auto-check status"
                    >
                      <Loader2 size={14} />
                    </button>
                  )}
                  {pollingIds.has(d.id) && (
                    <Loader2 size={14} className="animate-spin text-primary" />
                  )}
                  <button
                    onClick={() => handleDnsInstructions(d.id)}
                    className="px-2 py-1 rounded text-xs border border-border hover:bg-muted"
                  >
                    <RefreshCw size={12} className="inline mr-1" />
                    DNS
                  </button>
                  <button
                    onClick={() => handleVerify(d.id)}
                    className="px-2 py-1 rounded text-xs border border-border hover:bg-muted"
                  >
                    Re-check
                  </button>
                  <button
                    onClick={() => handleRemove(d.id)}
                    className="p-2 rounded-lg hover:bg-danger-bg text-danger transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">Close</button>
        </div>
      </div>
    </Modal>
  );
}

function DnsInstructions({ instructions, onRetry }: { instructions: any | null; onRetry: () => void }) {
  if (!instructions) {
    return (
      <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2 text-xs">
        <p className="text-muted-foreground">DNS instructions could not be loaded yet.</p>
        <button onClick={onRetry} className="mt-1 text-primary hover:underline">Retry</button>
      </div>
    );
  }

  const rankOneIPv4 = instructions.recommendedIPv4?.[0]?.value ?? [];
  const rankTwoIPv4 = instructions.recommendedIPv4?.[1]?.value ?? [];
  const cnames = instructions.recommendedCNAME?.map((record: any) => record.value) ?? [];

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-foreground">DNS instructions</p>
        <button onClick={onRetry} className="text-primary hover:underline">Refresh</button>
      </div>

      {rankOneIPv4.length > 0 && (
        <div>
          <p className="font-medium text-foreground">Recommended A records</p>
          <ul className="list-disc pl-4 text-muted-foreground">
            {rankOneIPv4.map((ip: string) => <li key={ip}>{ip}</li>)}
          </ul>
        </div>
      )}

      {rankTwoIPv4.length > 0 && (
        <div>
          <p className="font-medium text-foreground">Fallback A records</p>
          <ul className="list-disc pl-4 text-muted-foreground">
            {rankTwoIPv4.map((ip: string) => <li key={ip}>{ip}</li>)}
          </ul>
        </div>
      )}

      {cnames.length > 0 && (
        <div>
          <p className="font-medium text-foreground">CNAME fallback</p>
          <ul className="list-disc pl-4 text-muted-foreground">
            {cnames.map((cname: string) => <li key={cname}>{cname}</li>)}
          </ul>
        </div>
      )}

      <p className="text-muted-foreground">
        Configured by: {instructions.configuredBy ?? 'Not configured yet'}
      </p>
    </div>
  );
}

function StatusBadge({ label, state }: { label: string; state: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    verified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[state] || 'bg-gray-100 text-gray-800'}`}>
      {label}: {state}
    </span>
  );
}
