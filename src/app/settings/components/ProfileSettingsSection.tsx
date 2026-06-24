'use client';

import React, { useState, useEffect } from 'react';
import { User, Upload, Loader2, Save, CheckCircle } from 'lucide-react';

export default function ProfileSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    language: 'en',
    timezone: 'America/New_York',
    avatarUrl: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/store/settings');
      const data = await res.json();
      if (data.store) {
        setProfile({
          name: data.store.name || '',
          email: '', // Would come from user profile
          phone: data.store.fromAddressPhone || '',
          language: 'en',
          timezone: data.store.timezone || 'America/New_York',
          avatarUrl: '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
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
        body: JSON.stringify({
          name: profile.name,
          timezone: profile.timezone,
        }),
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

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';
  const labelCls = 'text-xs font-500 text-foreground block mb-1';

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <User size={16} className="text-primary" />
        <h3 className="text-sm font-600 text-foreground">Profile Settings</h3>
      </div>

      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-700">
            {profile.name.charAt(0).toUpperCase() || 'U'}
          </div>
          <button className="mt-2 text-xs text-primary hover:opacity-80 flex items-center gap-1">
            <Upload size={12} /> Upload
          </button>
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={inputCls}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className={inputCls}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className={inputCls}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div>
              <label className={labelCls}>Preferred Language</label>
              <select
                value={profile.language}
                onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                className={inputCls}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Timezone</label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                className={inputCls}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving...' : 'Save Changes'}
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
