'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Save, CheckCircle } from 'lucide-react';

export default function PreferencesSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState({
    dateFormat: 'MM/DD/YYYY',
    currencyDisplay: 'symbol',
    theme: 'system',
    defaultView: 'orders',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const res = await fetch('/api/store/settings');
      const data = await res.json();
      if (data.store?.preferences) {
        setPreferences({ ...preferences, ...data.store.preferences });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary transition-colors';
  const labelCls = 'text-xs font-500 text-foreground block mb-1';

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={16} className="text-primary" />
        <h3 className="text-sm font-600 text-foreground">Preferences</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Date Format</label>
          <select
            value={preferences.dateFormat}
            onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
            className={inputCls}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Currency Display</label>
          <select
            value={preferences.currencyDisplay}
            onChange={(e) => setPreferences({ ...preferences, currencyDisplay: e.target.value })}
            className={inputCls}
          >
            <option value="symbol">Symbol ($100.00)</option>
            <option value="code">Code (USD 100.00)</option>
            <option value="name">Name (100.00 US Dollars)</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Theme</label>
          <select
            value={preferences.theme}
            onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
            className={inputCls}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">Theme preference will be applied on next page load</p>
        </div>

        <div>
          <label className={labelCls}>Default Dashboard View</label>
          <select
            value={preferences.defaultView}
            onChange={(e) => setPreferences({ ...preferences, defaultView: e.target.value })}
            className={inputCls}
          >
            <option value="orders">Orders Dashboard</option>
            <option value="customers">Customers</option>
            <option value="products">Products</option>
            <option value="analytics">Analytics</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saved && (
          <span className="text-xs text-success flex items-center gap-1">
            <CheckCircle size={12} /> Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}