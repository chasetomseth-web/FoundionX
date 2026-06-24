'use client';

import React, { useState, useEffect } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Users, Search, RefreshCw, AlertCircle, Plus, Tag, Mail, X, Check, Loader2 } from 'lucide-react';

interface BrevoContact {
  id: number;
  email: string;
  emailBlacklisted: boolean;
  smsBlacklisted: boolean;
  createdAt: string;
  modifiedAt: string;
  listIds: number[];
  attributes: Record<string, unknown>;
}

interface ContactList {
  id: number;
  name: string;
  uniqueSubscribers: number;
  totalSubscribers: number;
}

function AddContactModal({ lists, onClose, onAdded }: { lists: ContactList[]; onClose: () => void; onAdded: () => void }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email) { setError('Email required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/email/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName, listIds: selectedLists }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="font-600 text-foreground">Add Contact to Brevo</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-danger-bg border border-danger/20 rounded-lg px-3 py-2 text-xs text-danger">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-600 text-foreground">Email *</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="contact@example.com"
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 text-foreground">First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John"
                className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 text-foreground">Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe"
                className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
            </div>
          </div>
          {lists.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 text-foreground">Add to Lists</label>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
                {lists.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={selectedLists.includes(l.id)} onChange={() => setSelectedLists(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])}
                      className="w-3.5 h-3.5 accent-primary" />
                    <span className="text-xs text-foreground">{l.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{l.uniqueSubscribers}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button onClick={onClose} className="flex-1 h-9 border border-border rounded-lg text-sm font-500 text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex-1 h-9 bg-foreground text-background rounded-lg text-sm font-500 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPageContent() {
  const [contacts, setContacts] = useState<BrevoContact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterList, setFilterList] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const LIMIT = 50;

  const fetchContacts = async (off = 0, listId?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (listId && listId !== 'all') params.set('listId', listId);
      const res = await fetch(`/api/email/contacts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setContacts(data.contacts ?? []);
      setTotal(data.count ?? 0);
      setOffset(off);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/email/contact-lists');
      const data = await res.json();
      setLists(data.lists ?? []);
    } catch {}
  };

  useEffect(() => {
    fetchContacts(0);
    fetchLists();
  }, []);

  const handleFilterList = (listId: string) => {
    setFilterList(listId);
    fetchContacts(0, listId);
  };

  const filtered = search
    ? contacts.filter((c) => c.email.toLowerCase().includes(search.toLowerCase()) ||
        String(c.attributes?.FIRSTNAME ?? '').toLowerCase().includes(search.toLowerCase()) ||
        String(c.attributes?.LASTNAME ?? '').toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const subscribedCount = contacts.filter((c) => !c.emailBlacklisted).length;
  const blacklistedCount = contacts.filter((c) => c.emailBlacklisted).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            Brevo-synced · {total} total contacts
            {loading && <RefreshCw size={10} className="animate-spin text-primary" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchContacts(0, filterList)} className="inline-flex items-center gap-2 px-3 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
            <RefreshCw size={13} />
            Refresh
          </button>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
            <Plus size={14} />
            Add Contact
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Contacts" value={String(total)} subValue="In Brevo" icon={Users} />
        <MetricCard label="Subscribed" value={String(subscribedCount)} subValue="Active on page" icon={Mail} variant="success" />
        <MetricCard label="Unsubscribed" value={String(blacklistedCount)} subValue="Blacklisted on page" icon={Tag} variant="warning" />
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-danger-bg border border-danger/20 rounded-xl p-4 text-sm text-danger">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-600">Brevo Error</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 flex-1 min-w-48">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input type="text" placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1" />
        </div>
        <select value={filterList} onChange={(e) => handleFilterList(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none cursor-pointer">
          <option value="all">All Lists</option>
          {lists.map((l) => <option key={l.id} value={String(l.id)}>{l.name} ({l.uniqueSubscribers})</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Lists</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Created</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No contacts found in Brevo
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const firstName = String(c.attributes?.FIRSTNAME ?? '');
                  const lastName = String(c.attributes?.LASTNAME ?? '');
                  const fullName = [firstName, lastName].filter(Boolean).join(' ');
                  const listNames = c.listIds.map((id) => lists.find((l) => l.id === id)?.name ?? `List ${id}`);
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-600 flex-shrink-0">
                            {(fullName || c.email).slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-sm text-foreground">{c.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{fullName || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {listNames.slice(0, 2).map((name) => (
                            <span key={name} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-500">{name}</span>
                          ))}
                          {listNames.length > 2 && <span className="text-[10px] text-muted-foreground">+{listNames.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${c.emailBlacklisted ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'}`}>
                          {c.emailBlacklisted ? 'Unsubscribed' : 'Subscribed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(c.modifiedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button disabled={offset === 0} onClick={() => fetchContacts(Math.max(0, offset - LIMIT), filterList)}
                className="h-7 px-3 rounded border border-border text-xs font-500 disabled:opacity-40 hover:bg-muted transition-colors">Previous</button>
              <button disabled={offset + LIMIT >= total} onClick={() => fetchContacts(offset + LIMIT, filterList)}
                className="h-7 px-3 rounded border border-border text-xs font-500 disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {showAdd && <AddContactModal lists={lists} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); fetchContacts(0, filterList); }} />}
    </div>
  );
}
