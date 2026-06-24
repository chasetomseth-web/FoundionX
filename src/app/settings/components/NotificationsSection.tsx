'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Loader2, Save, CheckCircle } from 'lucide-react';

export default function NotificationsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    orderAlerts: true,
    customerMessages: true,
    marketing: false,
    billing: true,
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/store/settings');
      const data = await res.json();
      if (data.store?.notifications) {
        setNotifications({ ...notifications, ...data.store.notifications });
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
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
        body: JSON.stringify({ notifications }),
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

  const notificationItems = [
    { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
    { key: 'sms', label: 'SMS Notifications', description: 'Receive notifications via text message' },
    { key: 'orderAlerts', label: 'Order Alerts', description: 'Get notified about new orders and order updates' },
    { key: 'customerMessages', label: 'Customer Message Alerts', description: 'Get notified when customers send messages' },
    { key: 'marketing', label: 'Marketing Notifications', description: 'Receive product updates and marketing tips' },
    { key: 'billing', label: 'Billing Notifications', description: 'Get notified about billing and payment issues' },
  ];

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-primary" />
        <h3 className="text-sm font-600 text-foreground">Notification Preferences</h3>
      </div>

      <div className="space-y-1">
        {notificationItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-500 text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                notifications[item.key as keyof typeof notifications] ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  notifications[item.key as keyof typeof notifications] ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
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
