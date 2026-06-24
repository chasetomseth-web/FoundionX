'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Key, Wifi, WifiOff, Save, Trash2, RefreshCw, Plus, Play, Pause, Upload, Users, BarChart2, Mail, AlertCircle, CheckCircle2, Send, MousePointerClick, MessageSquare, Eye, Loader2, X, FileText, CheckSquare, Inbox, ExternalLink, Edit2, ToggleLeft, ToggleRight, Clock, Search, Filter, Zap } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import BackButton from '@/components/ui/back-button';


// ─── Types ───────────────────────────────────────────────────────────────────

interface ConnectionStatus {
  hasKey: boolean;
  maskedKey: string | null;
  connected: boolean;
  accountInfo: unknown;
}

interface Sequence {
  _id: string;
  name: string;
  paused: boolean;
  totalLeads?: number;
  sentCount?: number;
  openRate?: number;
  replyRate?: number;
  createdAt?: string;
  status?: string;
}

interface LeadList {
  _id: string;
  name: string;
  count?: number;
  createdAt?: string;
}

interface Task {
  _id: string;
  title?: string;
  type?: string;
  status?: string;
  dueDate?: string;
  leadEmail?: string;
  sequenceName?: string;
  notes?: string;
  createdAt?: string;
}

interface Template {
  _id: string;
  name: string;
  subject?: string;
  body?: string;
  type?: string;
  createdAt?: string;
}

interface Sender {
  _id: string;
  email: string;
  name?: string;
  provider?: string;
  status?: string;
  dailyLimit?: number;
  sentToday?: number;
  warmupEnabled?: boolean;
}

interface ReportEntry {
  _id?: string;
  email?: string;
  recipientEmail?: string;
  sequenceName?: string;
  subject?: string;
  timestamp?: string;
  createdAt?: string;
  [key: string]: unknown;
}

type Tab = 'connection' | 'sequences' | 'lists' | 'tasks' | 'reports' | 'templates' | 'senders';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle size={14} className="text-destructive flex-shrink-0" />
      <p className="text-xs text-destructive">{message}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={36} className="text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
    </div>
  );
}

// ─── Connection Tab ───────────────────────────────────────────────────────────

function ConnectionTab() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/cold-outreach/settings');
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('Failed to load connection status');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/cold-outreach/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save API key');
      } else {
        setSuccess('API key saved and verified successfully');
        setApiKey('');
        fetchStatus();
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect SalesBlink? This will remove your API key.')) return;
    try {
      await fetch('/api/cold-outreach/settings', { method: 'DELETE' });
      setStatus(null);
      setSuccess('Disconnected successfully');
    } catch {
      setError('Failed to disconnect');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${status?.connected ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'}`}>
        {status?.connected ? (
          <><Wifi size={18} className="text-emerald-600 flex-shrink-0" /><div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Connected to SalesBlink</p><p className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-0.5">API key active · Cold outreach engine ready</p></div></>
        ) : (
          <><WifiOff size={18} className="text-amber-600 flex-shrink-0" /><div><p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Not Connected</p><p className="text-xs text-amber-600/70 dark:text-amber-500 mt-0.5">Enter your SalesBlink API key below to connect</p></div></>
        )}
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">2-Engine Email Architecture</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">🔵 Brevo — Warm Channel</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-500 mt-1">Transactions · Campaigns · Lifecycle</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">🔴 SalesBlink — Cold Channel</p>
            <p className="text-xs text-red-600/70 dark:text-red-500 mt-1">Outbound · Sequences · Follow-ups</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">SalesBlink API Key</h3>
        </div>

        {status?.hasKey && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
            <span className="text-sm font-mono text-muted-foreground">{status.maskedKey}</span>
          </div>
        )}

        <div className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={status?.hasKey ? 'Enter new API key to replace existing' : 'Paste your SalesBlink API key'}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <p className="text-xs text-muted-foreground">
            Get your key at{' '}
            <a href="https://run.salesblink.io/account/integration/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              run.salesblink.io/account/integration/api
            </a>
          </p>
        </div>

        {error && <ErrorBanner message={error} />}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{success}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Verifying...' : 'Save & Connect'}
          </button>
          {status?.hasKey && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sequences Tab ────────────────────────────────────────────────────────────

function SequencesTab() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchSequences = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cold-outreach/sequences');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load sequences'); return; }
      setSequences(data?.data || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/cold-outreach/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), steps: [] }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create sequence'); return; }
      setNewName('');
      setShowCreate(false);
      fetchSequences();
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(seq: Sequence) {
    setToggling(seq._id);
    try {
      const res = await fetch('/api/cold-outreach/sequences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seq._id, paused: !seq.paused }),
      });
      if (res.ok) {
        setSequences((prev) => prev.map((s) => s._id === seq._id ? { ...s, paused: !s.paused } : s));
      }
    } catch { /* ignore */ } finally {
      setToggling(null);
    }
  }

  const filtered = sequences.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Sequences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage cold email sequences — synced with SalesBlink</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSequences} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14} /> New Sequence
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Create New Sequence</p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Sequence name (e.g. Q3 SaaS Outreach)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newName.trim() || creating} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sequences..."
          className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Mail} title="No sequences yet" subtitle="Create your first cold outreach sequence above" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sequence</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leads</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sent</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reply %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((seq, i) => (
                <tr key={seq._id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{seq.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{seq._id.slice(-8)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${seq.paused ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>
                      {seq.paused ? <Pause size={10} /> : <Play size={10} />}
                      {seq.paused ? 'Paused' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{seq.totalLeads ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{seq.sentCount ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{seq.openRate != null ? `${seq.openRate}%` : '—'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{seq.replyRate != null ? `${seq.replyRate}%` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggle(seq)}
                        disabled={toggling === seq._id}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title={seq.paused ? 'Resume sequence' : 'Pause sequence'}
                      >
                        {toggling === seq._id ? <Loader2 size={13} className="animate-spin" /> : seq.paused ? <Play size={13} /> : <Pause size={13} />}
                      </button>
                      <a
                        href={`https://run.salesblink.io/sequences/${seq._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Open in SalesBlink"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sequence Stats Summary */}
      {sequences.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{sequences.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Sequences</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{sequences.filter((s) => !s.paused).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{sequences.filter((s) => s.paused).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Paused</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lists Tab ────────────────────────────────────────────────────────────────

function ListsTab() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedList, setSelectedList] = useState<string>('');
  const [csvText, setCsvText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cold-outreach/leads');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load lists'); return; }
      setLists(data?.data || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  async function handleCreateList() {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/cold-outreach/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_list', name: newListName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create list'); return; }
      setNewListName('');
      setShowAddList(false);
      fetchLists();
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || '');
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (!csvText || !selectedList) return;
    setUploading(true);
    setUploadResult('');
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
      const contacts = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return {
          Email: obj.email || '',
          First_Name: obj['first name'] || obj.firstname || obj.first_name || '',
          Last_Name: obj['last name'] || obj.lastname || obj.last_name || '',
          Company: obj.company || '',
        };
      }).filter((c) => c.Email);

      const res = await fetch('/api/cold-outreach/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_contacts', contacts, listId: selectedList }),
      });
      const data = await res.json();
      if (!res.ok) { setUploadResult(`Error: ${data.error}`); return; }
      setUploadResult(`✓ ${contacts.length} contacts uploaded successfully`);
      setCsvText('');
      if (fileRef.current) fileRef.current.value = '';
      fetchLists();
    } catch {
      setUploadResult('Upload failed — please try again');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Lists</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your lists of leads — synced with SalesBlink</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLists} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
          <button onClick={() => setShowAddList(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14} /> New List
          </button>
        </div>
      </div>

      {showAddList && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Create Lead List</p>
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name (e.g. SaaS Founders Q3)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleCreateList} disabled={!newListName.trim() || creating} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create
            </button>
            <button onClick={() => setShowAddList(false)} className="px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {/* CSV Upload */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload size={15} className="text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Import Leads via CSV</h4>
        </div>
        <p className="text-xs text-muted-foreground">CSV columns: <code className="bg-muted px-1 rounded text-xs">email, first name, last name, company</code></p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target List</label>
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">Select a list...</option>
              {lists.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">CSV File</label>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground cursor-pointer" />
          </div>
        </div>

        {csvText && (
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{csvText.trim().split('\n').length - 1} leads detected in file</p>
          </div>
        )}

        {uploadResult && (
          <div className={`p-3 rounded-lg text-xs font-medium ${uploadResult.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
            {uploadResult}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!csvText || !selectedList || uploading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading...' : 'Upload Leads'}
        </button>
      </div>

      {/* Lists Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>
      ) : lists.length === 0 ? (
        <EmptyState icon={Users} title="No lead lists yet" subtitle="Create a list and upload your first leads" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">List Name</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contacts</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((l) => (
                <tr key={l._id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{l.name}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{l.count ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground/60">{l._id.slice(-8)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`https://run.salesblink.io/lists/${l._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground inline-flex"
                      title="Open in SalesBlink"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cold-outreach/tasks');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load tasks'); return; }
      setTasks(data?.data || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function handleComplete(task: Task) {
    try {
      await fetch('/api/cold-outreach/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task._id, status: 'completed' }),
      });
      setTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: 'completed' } : t));
    } catch { /* ignore */ }
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Tasks</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manual outreach tasks from your sequences</p>
        </div>
        <button onClick={fetchTasks} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCw size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            {f}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks found" subtitle="Tasks from your sequences will appear here" />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div key={task._id} className={`bg-card border border-border rounded-xl p-4 flex items-start gap-3 transition-opacity ${task.status === 'completed' ? 'opacity-60' : ''}`}>
              <button
                onClick={() => task.status !== 'completed' && handleComplete(task)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-primary'}`}
              >
                {task.status === 'completed' && <CheckCircle2 size={12} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title || task.type || 'Manual Task'}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {task.leadEmail && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail size={10} /> {task.leadEmail}
                    </span>
                  )}
                  {task.sequenceName && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap size={10} /> {task.sequenceName}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {task.dueDate}
                    </span>
                  )}
                </div>
                {task.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">{task.notes}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                {task.status === 'completed' ? 'Done' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────────────────────────

function ReportsTab() {
  const [reportType, setReportType] = useState<'sent' | 'opens' | 'clicks' | 'replies'>('sent');
  const [data, setData] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sequenceFilter, setSequenceFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type: reportType });
      if (sequenceFilter) params.set('sequence_id', sequenceFilter);
      if (emailFilter) params.set('email', emailFilter);
      const res = await fetch(`/api/cold-outreach/reports?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to load report'); return; }
      setData(json?.data || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [reportType, sequenceFilter, emailFilter]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const REPORT_TABS = [
    { id: 'sent' as const, label: 'Sent', icon: Send, color: 'text-blue-500' },
    { id: 'opens' as const, label: 'Opens', icon: Eye, color: 'text-violet-500' },
    { id: 'clicks' as const, label: 'Clicks', icon: MousePointerClick, color: 'text-amber-500' },
    { id: 'replies' as const, label: 'Replies', icon: MessageSquare, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Reports</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Logs &amp; reports for sequences — live from SalesBlink</p>
        </div>
        <button onClick={fetchReport} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCw size={14} className="text-muted-foreground" />
        </button>
      </div>

      {/* Report type tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${reportType === tab.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              <Icon size={13} className={reportType === tab.id ? '' : tab.color} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={sequenceFilter}
            onChange={(e) => setSequenceFilter(e.target.value)}
            placeholder="Filter by sequence ID..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="Filter by recipient email..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>
      ) : data.length === 0 ? (
        <EmptyState icon={BarChart2} title={`No ${reportType} data`} subtitle="Data will appear here once your sequences start running" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{reportType} Log</span>
            <span className="text-xs text-muted-foreground">{data.length} records</span>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {data.map((entry, i) => (
              <div key={entry._id || i} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.email || entry.recipientEmail || 'Unknown recipient'}
                    </p>
                    {entry.subject && <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.subject}</p>}
                    {entry.sequenceName && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Zap size={10} /> {entry.sequenceName}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {entry.timestamp || entry.createdAt ? new Date((entry.timestamp || entry.createdAt) as string).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cold-outreach/templates');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load templates'); return; }
      setTemplates(data?.data || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', subject: '', body: '' });
    setShowCreate(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject || '', body: t.body || '' });
    setShowCreate(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch('/api/cold-outreach/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing._id, ...form }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to update template'); return; }
        setTemplates((prev) => prev.map((t) => t._id === editing._id ? { ...t, ...form } : t));
      } else {
        const res = await fetch('/api/cold-outreach/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to create template'); return; }
        fetchTemplates();
      }
      setShowCreate(false);
      setEditing(null);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/cold-outreach/templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) setTemplates((prev) => prev.filter((t) => t._id !== id));
    } catch { /* ignore */ }
  }

  const filtered = templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || (t.subject || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Templates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage email templates &amp; task templates — synced with SalesBlink</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTemplates} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editing ? 'Edit Template' : 'Create Template'}</p>
            <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-muted transition-colors">
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Template Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. SaaS Intro Email"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject Line</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Quick question about {{company}}"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={7}
                placeholder="Hey {{first_name}},&#10;&#10;[Your message here]&#10;&#10;[Your name]"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Variables: <code className="bg-muted px-1 rounded">{'{{first_name}}'}</code> <code className="bg-muted px-1 rounded">{'{{last_name}}'}</code> <code className="bg-muted px-1 rounded">{'{{company}}'}</code></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Saving...' : editing ? 'Update Template' : 'Create Template'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No templates yet" subtitle="Create reusable email templates for your sequences" />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t._id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    {t.type && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">{t.type}</span>}
                  </div>
                  {t.subject && <p className="text-xs text-muted-foreground mt-1 truncate">Subject: {t.subject}</p>}
                  {t.body && <p className="text-xs text-muted-foreground mt-1 truncate opacity-70">{t.body.slice(0, 100)}{t.body.length > 100 ? '...' : ''}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(t._id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Email Senders Tab ────────────────────────────────────────────────────────

function SendersTab() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSenders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cold-outreach/senders');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load senders'); return; }
      setSenders(data?.data || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSenders(); }, [fetchSenders]);

  function getProviderColor(provider?: string) {
    if (!provider) return 'bg-muted text-muted-foreground';
    const p = provider.toLowerCase();
    if (p.includes('gmail') || p.includes('google')) return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
    if (p.includes('outlook') || p.includes('microsoft')) return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
    if (p.includes('smtp')) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400';
    return 'bg-muted text-muted-foreground';
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Email Senders</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage email addresses used for cold outreach — synced with SalesBlink</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSenders} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw size={14} className="text-muted-foreground" />
          </button>
          <a
            href="https://run.salesblink.io/email-senders"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink size={13} /> Add Sender in SalesBlink
          </a>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Add senders in SalesBlink</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-1">Connect Gmail, Outlook, or SMTP accounts directly in SalesBlink. Changes sync back here automatically.</p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>
      ) : senders.length === 0 ? (
        <EmptyState icon={Inbox} title="No email senders connected" subtitle="Add email senders in SalesBlink to start sending cold emails" />
      ) : (
        <div className="space-y-3">
          {senders.map((sender) => (
            <div key={sender._id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{sender.email}</p>
                    {sender.name && <span className="text-xs text-muted-foreground">({sender.name})</span>}
                    {sender.provider && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getProviderColor(sender.provider)}`}>
                        {sender.provider}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sender.status === 'active' || !sender.status ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      {sender.status || 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    {sender.dailyLimit != null && (
                      <span className="text-xs text-muted-foreground">
                        Daily limit: <span className="font-medium text-foreground">{sender.dailyLimit}</span>
                      </span>
                    )}
                    {sender.sentToday != null && (
                      <span className="text-xs text-muted-foreground">
                        Sent today: <span className="font-medium text-foreground">{sender.sentToday}</span>
                      </span>
                    )}
                    {sender.warmupEnabled != null && (
                      <span className={`text-xs flex items-center gap-1 ${sender.warmupEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {sender.warmupEnabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        Warmup {sender.warmupEnabled ? 'on' : 'off'}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={`https://run.salesblink.io/email-senders`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                  title="Manage in SalesBlink"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {senders.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{senders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Senders</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{senders.filter((s) => !s.status || s.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 tabular-nums">{senders.filter((s) => s.warmupEnabled).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Warmup On</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'connection', label: 'API Connection', icon: Key },
  { id: 'sequences', label: 'Sequences', icon: Zap },
  { id: 'lists', label: 'Lists', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'senders', label: 'Email Senders', icon: Inbox },
];

export default function ColdOutreachPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>('sequences');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold">
              🔴 Cold Engine
            </span>
            <span className="text-xs text-muted-foreground">Isolated from Brevo warm channel</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cold Outreach</h1>
          <p className="text-sm text-muted-foreground mt-1">Outbound acquisition &amp; follow-up sequences — powered by SalesBlink</p>
        </div>
        <a
          href="https://run.salesblink.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink size={12} /> Open SalesBlink
        </a>
      </div>

      {/* Tab Nav */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5' :'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'connection' && <ConnectionTab />}
          {activeTab === 'sequences' && <SequencesTab />}
          {activeTab === 'lists' && <ListsTab />}
          {activeTab === 'tasks' && <TasksTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'senders' && <SendersTab />}
        </div>
      </div>
    </div>
  );
}
