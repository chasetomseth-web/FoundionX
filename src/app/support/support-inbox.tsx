'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/ui/back-button';

type TicketStatus = 'open' | 'pending' | 'resolved';

type SupportTicket = {
  id: string;
  customerName: string | null;
  customerEmail: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

type SupportMessage = {
  id: string;
  ticketId: string;
  senderType: 'customer' | 'agent';
  senderEmail: string | null;
  body: string;
  createdAt: string;
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function SupportInbox() {
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TicketStatus>('all');

  async function loadTickets() {
    const res = await fetch('/api/tickets');
    if (!res.ok) throw new Error('Failed to load tickets');
    const data = await res.json();
    setTickets(data.tickets ?? []);
    const first = data.tickets?.[0]?.id ?? null;
    setSelectedId((prev) => prev ?? first);
  }

  async function loadThread(id: string) {
    const res = await fetch(`/api/tickets/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to load ticket');
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    loadTickets().catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadThread(selectedId).catch((e) => console.error(e));
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const statusOk = filterStatus === 'all' ? true : t.status === filterStatus;
      const qOk =
        !q ||
        t.subject.toLowerCase().includes(q) ||
        t.customerEmail.toLowerCase().includes(q) ||
        (t.customerName ?? '').toLowerCase().includes(q);
      return statusOk && qOk;
    });
  }, [tickets, search, filterStatus]);

  const selectedTicket = selectedId ? tickets.find((t) => t.id === selectedId) ?? null : null;

  return (
    <div className="min-h-[calc(100vh-64px)] p-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <BackButton />
            <h1 className="text-2xl font-semibold">Support Desk</h1>
            <p className="text-sm text-slate-500">Combat Creatine Support Desk</p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="w-64 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <aside className="col-span-4 border rounded-lg overflow-hidden">
            <div className="p-3 bg-slate-50 border-b">
              <div className="text-sm font-medium">Tickets</div>
              <div className="text-xs text-slate-500">{filtered.length} shown</div>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              {filtered.map((t) => {
                const active = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-3 py-3 border-b last:border-b-0 hover:bg-slate-50 ${active ? 'bg-slate-100' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold truncate">{t.subject}</div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-1">{t.customerEmail}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Updated {formatDate(t.updatedAt)}</div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-4 text-sm text-slate-500">No tickets found.</div>
              )}
            </div>
          </aside>

          <main className="col-span-8 border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 bg-slate-50 border-b">
              {selectedTicket ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{selectedTicket.subject}</div>
                    <div className="text-xs text-slate-500 truncate">{selectedTicket.customerEmail}</div>
                  </div>
                  <button
                    className="text-sm px-3 py-2 rounded-md border border-slate-200 hover:bg-white"
                    onClick={() => router.push(`/support/${encodeURIComponent(selectedTicket.id)}`)}
                  >
                    Full view
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Select a ticket</div>
              )}
            </div>

            <div className="flex-1 p-4 overflow-auto bg-white">
              {messages.length === 0 ? (
                <div className="text-sm text-slate-500">No messages yet.</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const isCustomer = m.senderType === 'customer';
                    return (
                      <div key={m.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap border ${
                            isCustomer
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-indigo-50 border-indigo-200'
                          }`}
                        >
                          <div className="text-[11px] text-slate-500 mb-1">
                            {isCustomer ? 'Customer' : 'Agent'} • {formatDate(m.createdAt)}
                          </div>
                          {m.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedId && (
              <ReplyComposer ticketId={selectedId} onSent={() => loadThread(selectedId)} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function ReplyComposer({
  ticketId,
  onSent,
}: {
  ticketId: string;
  onSent: () => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error('Reply failed');
      setBody('');
      onSent();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-3 border-t bg-white">
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply..."
          className="flex-1 min-h-[44px] resize-none rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          onClick={send}
          disabled={sending}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <div className="text-xs text-slate-500 mt-2">Replying sets ticket status to pending.</div>
    </div>
  );
}

