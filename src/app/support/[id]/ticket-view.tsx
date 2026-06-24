'use client';

import { useEffect, useState } from 'react';

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

export default function SupportTicketView({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [statusSaving, setStatusSaving] = useState(false);

  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  async function load() {
    const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}`);
    if (!res.ok) throw new Error('Failed to load ticket');
    const data = await res.json();
    setTicket(data.ticket ?? null);
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    load().catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function updateStatus(next: TicketStatus) {
    if (!ticket) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticket.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('Status update failed');
      await load();
    } finally {
      setStatusSaving(false);
    }
  }

  async function sendReply() {
    if (!ticket) return;
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticket.id)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error('Reply failed');
      setBody('');
      await load();
    } finally {
      setSending(false);
    }
  }

  async function handleSuggest() {
    if (!ticket) return;
    setSuggesting(true);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticket.id)}/suggest`);
      if (!res.ok) throw new Error('Suggest failed');
      const data = await res.json();
      const suggestion = data.suggestion ?? '';
      if (suggestion) setBody((b) => (b ? b + '\n\n' + suggestion : suggestion));
    } catch (e) {
      console.error(e);
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-6 bg-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          {ticket ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
                <div className="text-sm text-slate-500 mt-1">
                  {ticket.customerEmail} • Created {formatDate(ticket.createdAt)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={ticket.status} />
                <div className="flex gap-2">
                  <button
                    disabled={statusSaving}
                    onClick={() => updateStatus('open')}
                    className="text-xs px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Open
                  </button>
                  <button
                    disabled={statusSaving}
                    onClick={() => updateStatus('pending')}
                    className="text-xs px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Pending
                  </button>
                  <button
                    disabled={statusSaving}
                    onClick={() => updateStatus('resolved')}
                    className="text-xs px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Loading…</div>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="p-3 bg-slate-50 border-b text-sm font-medium">Conversation</div>
          <div className="p-4 bg-white h-[62vh] overflow-auto">
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
                          isCustomer ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-200'
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

          <div className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a reply…"
                className="flex-1 min-h-[44px] resize-none rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSuggest}
                  disabled={suggesting}
                  className="text-xs px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  {suggesting ? 'Suggesting…' : 'Suggest reply'}
                </button>
                <button
                  onClick={sendReply}
                  disabled={sending}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">Agent reply sets status to pending.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

