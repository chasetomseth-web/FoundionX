'use client';

import React, { useState } from 'react';
import { Inbox, MessageSquare, CheckCircle, Clock, AlertCircle, Search, Send, RefreshCw, User } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


type TicketStatus = 'open' | 'pending' | 'resolved';

interface SupportTicket {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  body: string;
  status: TicketStatus;
  createdAt: string;
  replies: Array<{ from: string; body: string; createdAt: string; isAgent: boolean }>;
}

// Mock support inbox — in production this would connect to Brevo inbound email routing
const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'ticket-001',
    from: 'customer@example.com',
    fromName: 'Alex Johnson',
    subject: 'Order not received',
    preview: 'Hi, I placed an order 2 weeks ago and still haven\'t received it...',
    body: 'Hi,\n\nI placed an order 2 weeks ago (Order #1234) and still haven\'t received it. The tracking number shows it was delivered but I never got it. Can you help?\n\nThanks,\nAlex',
    status: 'open',
    createdAt: '2026-05-22T10:30:00Z',
    replies: [],
  },
  {
    id: 'ticket-002',
    from: 'jane.doe@gmail.com',
    fromName: 'Jane Doe',
    subject: 'Subscription cancellation request',
    preview: 'I would like to cancel my subscription effective immediately...',
    body: 'Hello,\n\nI would like to cancel my subscription effective immediately. Please confirm the cancellation and ensure I am not charged next month.\n\nBest,\nJane',
    status: 'pending',
    createdAt: '2026-05-21T14:15:00Z',
    replies: [
      { from: 'support@merchantos.com', body: 'Hi Jane, we have received your request and are processing it. You will receive a confirmation within 24 hours.', createdAt: '2026-05-21T15:00:00Z', isAgent: true },
    ],
  },
  {
    id: 'ticket-003',
    from: 'bob.smith@outlook.com',
    fromName: 'Bob Smith',
    subject: 'Refund request for damaged item',
    preview: 'The product I received was damaged. I\'d like a full refund...',
    body: 'Hi there,\n\nThe product I received was damaged during shipping. I have attached photos. I would like a full refund please.\n\nBob Smith',
    status: 'resolved',
    createdAt: '2026-05-20T09:00:00Z',
    replies: [
      { from: 'support@merchantos.com', body: 'Hi Bob, we are sorry to hear about the damage. We have processed a full refund which will appear in 3-5 business days.', createdAt: '2026-05-20T10:30:00Z', isAgent: true },
    ],
  },
  {
    id: 'ticket-004',
    from: 'maria.garcia@yahoo.com',
    fromName: 'Maria Garcia',
    subject: 'Question about product ingredients',
    preview: 'I wanted to ask about the ingredients in your Combat Creatine...',
    body: 'Hello,\n\nI wanted to ask about the ingredients in your Combat Creatine product. I have a soy allergy and want to make sure it is safe for me to use.\n\nThank you,\nMaria',
    status: 'open',
    createdAt: '2026-05-22T08:45:00Z',
    replies: [],
  },
];

const statusConfig: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'Open', color: 'bg-danger-bg text-danger', icon: AlertCircle },
  pending: { label: 'Pending', color: 'bg-warning-bg text-warning', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-success-bg text-success', icon: CheckCircle },
};

export default function InboxPageContent() {
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const filtered = tickets.filter((t) => {
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.fromName.toLowerCase().includes(search.toLowerCase()) || t.from.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const pendingCount = tickets.filter((t) => t.status === 'pending').length;

  const updateStatus = (id: string, status: TicketStatus) => {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    // Simulate sending — in production this would use Brevo SMTP reply
    await new Promise((r) => setTimeout(r, 800));
    const reply = {
      from: 'support@merchantos.com',
      body: replyText,
      createdAt: new Date().toISOString(),
      isAgent: true,
    };
    setTickets((prev) => prev.map((t) => t.id === selected.id ? { ...t, replies: [...t.replies, reply], status: 'pending' as TicketStatus } : t));
    setSelected((prev) => prev ? { ...prev, replies: [...prev.replies, reply], status: 'pending' } : null);
    setReplyText('');
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Support Inbox</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{openCount} open · {pendingCount} pending</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-info-bg border border-info/20 text-info text-xs font-600">
            <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
            Brevo Inbound
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Inbox size={16} className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-600 text-foreground">Inbound Email Routing</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            To receive real support emails here, configure inbound email routing in <a href="https://app.brevo.com/inbound-parsing/list" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Brevo → Inbound Parsing</a>. Set your support email (e.g., support@yourdomain.com) to forward to Brevo's inbound webhook.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 flex-1 min-w-48">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input type="text" placeholder="Search tickets…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1" />
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {(['all', 'open', 'pending', 'resolved'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-500 transition-colors capitalize ${statusFilter === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 min-h-[500px]">
        {/* Ticket List */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
              No tickets found
            </div>
          ) : (
            filtered.map((t) => {
              const cfg = statusConfig[t.status];
              const Icon = cfg.icon;
              return (
                <div key={t.id} onClick={() => setSelected(t)}
                  className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${selected?.id === t.id ? 'border-primary shadow-sm' : 'border-border hover:border-primary/30'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-600 flex-shrink-0">
                        {t.fromName.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-600 text-foreground truncate">{t.fromName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{t.from}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-500 ${cfg.color}`}>
                      <Icon size={9} /> {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs font-500 text-foreground truncate">{t.subject}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.preview}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Ticket Detail */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-card border border-border rounded-xl h-full flex flex-col items-center justify-center gap-3 text-center p-8">
              <MessageSquare size={32} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select a ticket to view the conversation</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl flex flex-col h-full">
              {/* Ticket header */}
              <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-600 text-foreground">{selected.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User size={11} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{selected.fromName} &lt;{selected.from}&gt;</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value as TicketStatus)}
                    className="h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none cursor-pointer">
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Conversation */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {/* Original message */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-600">
                      {selected.fromName.slice(0, 1)}
                    </div>
                    <span className="text-xs font-500 text-foreground">{selected.fromName}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="ml-9 bg-muted/40 rounded-xl p-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selected.body}</p>
                  </div>
                </div>

                {/* Replies */}
                {selected.replies.map((r, i) => (
                  <div key={i} className={`flex flex-col gap-1.5 ${r.isAgent ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 ${r.isAgent ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-600 ${r.isAgent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {r.isAgent ? 'A' : selected.fromName.slice(0, 1)}
                      </div>
                      <span className="text-xs font-500 text-foreground">{r.isAgent ? 'Support Agent' : selected.fromName}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`max-w-[80%] rounded-xl p-3 ${r.isAgent ? 'bg-primary/10 mr-9' : 'bg-muted/40 ml-9'}`}>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              {selected.status !== 'resolved' && (
                <div className="border-t border-border p-4 flex flex-col gap-2">
                  <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3}
                    placeholder="Type your reply…"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary resize-none" />
                  <div className="flex items-center justify-between">
                    <button onClick={() => updateStatus(selected.id, 'resolved')}
                      className="flex items-center gap-1.5 text-xs text-success hover:opacity-80">
                      <CheckCircle size={12} /> Mark Resolved
                    </button>
                    <button onClick={sendReply} disabled={sending || !replyText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                      {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                      Send Reply
                    </button>
                  </div>
                </div>
              )}
              {selected.status === 'resolved' && (
                <div className="border-t border-border p-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle size={14} /> This ticket is resolved
                  </span>
                  <button onClick={() => updateStatus(selected.id, 'open')} className="text-xs text-primary hover:opacity-80">
                    Reopen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
