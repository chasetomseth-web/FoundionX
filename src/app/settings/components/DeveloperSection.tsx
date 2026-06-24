'use client';

import React, { useState, useEffect } from 'react';
import { Code, Loader2, Plus, Trash2, X, Copy, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

export default function DeveloperSection() {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    url: '',
    events: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const availableEvents = [
    'order.created',
    'order.paid',
    'order.shipped',
    'customer.created',
    'subscription.created',
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        fetch('/api/developer/keys'),
        fetch('/api/developer/webhooks'),
      ]);
      const keysData = await keysRes.json();
      const webhooksData = await webhooksRes.json();
      setApiKeys(keysData.keys || []);
      setWebhooks(webhooksData.webhooks || []);
    } catch (error) {
      console.error('Failed to load developer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!keyName) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName }),
      });
      const data = await res.json();
      setGeneratedKey(data.key);
      setKeyName('');
      loadData();
    } catch (error) {
      console.error('Generate key error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddWebhook = async () => {
    if (!webhookForm.url || webhookForm.events.length === 0) return;
    setSaving(true);
    try {
      await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookForm),
      });
      setWebhookForm({ url: '', events: [] });
      setShowWebhookForm(false);
      loadData();
    } catch (error) {
      console.error('Add webhook error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await fetch(`/api/developer/webhooks?id=${id}`, { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error('Delete webhook error:', error);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    toast.success('API key copied to clipboard');
  };

  const toggleEvent = (event: string) => {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Code size={16} className="text-primary" />
        <h3 className="text-sm font-600 text-foreground">Developer Settings</h3>
      </div>

      {/* API Keys */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-600 text-foreground">API Keys</h4>
          <button
            onClick={() => setShowKeyModal(true)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80 font-500"
          >
            <Plus size={12} />
            Generate New Key
          </button>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Prefix</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Created</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No API keys yet. Generate one to get started.
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-foreground">{key.name}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-muted-foreground">{key.prefix}...</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1 hover:bg-danger-bg rounded text-danger transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhooks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-600 text-foreground">Webhooks</h4>
          <button
            onClick={() => setShowWebhookForm(!showWebhookForm)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80 font-500"
          >
            <Plus size={12} />
            Add Webhook
          </button>
        </div>

        {showWebhookForm && (
          <div className="border border-border rounded-lg p-4 mb-3 space-y-3">
            <div>
              <label className="text-xs font-500 text-foreground block mb-1">Webhook URL</label>
              <input
                type="url"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                placeholder="https://yoursite.com/webhooks"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-500 text-foreground block mb-2">Events</label>
              <div className="space-y-2">
                {availableEvents.map((event) => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookForm.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="rounded"
                    />
                    <span className="text-xs text-foreground">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddWebhook}
                disabled={saving || !webhookForm.url || webhookForm.events.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {saving ? 'Adding...' : 'Add Webhook'}
              </button>
              <button
                onClick={() => setShowWebhookForm(false)}
                className="px-4 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">URL</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Events</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {webhooks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No webhooks configured
                  </td>
                </tr>
              ) : (
                webhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-foreground">{webhook.url}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{webhook.events.length} events</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="p-1 hover:bg-danger-bg rounded text-danger transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-600 text-foreground">Generate API Key</h3>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setGeneratedKey('');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!generatedKey ? (
                <>
                  <div>
                    <label className="text-xs font-500 text-foreground block mb-1">Key Name</label>
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="Production API"
                      className={inputCls}
                    />
                  </div>
                  <button
                    onClick={handleGenerateKey}
                    disabled={generating || !keyName}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {generating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    {generating ? 'Generating...' : 'Generate Key'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-warning-bg border border-warning/20 rounded-lg p-3 text-xs text-warning">
                    ⚠️ Save this key now. You won't be able to see it again.
                  </div>
                  <div>
                    <label className="text-xs font-500 text-foreground block mb-1">Your API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedKey}
                        readOnly
                        className={`${inputCls} font-mono`}
                      />
                      <button
                        onClick={copyKey}
                        className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}