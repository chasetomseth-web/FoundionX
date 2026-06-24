'use client';

import React, { useState } from 'react';
import { Shield, Loader2, Save, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function SecuritySection() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [securityNotifications, setSecurityNotifications] = useState({
    newLogin: true,
    passwordChange: true,
  });
  const [error, setError] = useState('');

  const sessions = [
    { device: 'Chrome on macOS', ip: '192.168.1.1', lastActive: '2 minutes ago', current: true },
    { device: 'Safari on iPhone', ip: '10.0.0.5', lastActive: '3 hours ago', current: false },
  ];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/customer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update password');
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';
  const labelCls = 'text-xs font-500 text-foreground block mb-1';

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-primary" />
        <h3 className="text-sm font-600 text-foreground">Login & Security</h3>
      </div>

      {/* Password Change */}
      <div className="space-y-4">
        <h4 className="text-sm font-600 text-foreground">Change Password</h4>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className={labelCls}>Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className={inputCls}
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.current ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className={inputCls}
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.new ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Confirm New Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className={inputCls}
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-danger bg-danger-bg rounded-lg px-3 py-2">
              <AlertCircle size={12} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Updating...' : 'Update Password'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-success ml-2">
              <CheckCircle size={12} /> Password updated
            </span>
          )}
        </form>
      </div>

      {/* 2FA */}
      <div className="border-t border-border pt-6 space-y-3">
        <h4 className="text-sm font-600 text-foreground">Two-Factor Authentication</h4>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-foreground">Enable 2FA</p>
            <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Coming Soon</span>
            <button
              disabled
              className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-gray-200 opacity-50"
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="border-t border-border pt-6 space-y-3">
        <h4 className="text-sm font-600 text-foreground">Active Sessions</h4>
        <div className="bg-muted/30 border border-border rounded-lg divide-y divide-border">
          {sessions.map((session, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-500 text-foreground flex items-center gap-2">
                  {session.device}
                  {session.current && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success">Current</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.ip} • Last active {session.lastActive}
                </p>
              </div>
              {!session.current && (
                <button className="text-xs text-danger hover:opacity-80">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Notifications */}
      <div className="border-t border-border pt-6 space-y-3">
        <h4 className="text-sm font-600 text-foreground">Security Notifications</h4>
        <div className="space-y-2">
          {[
            { key: 'newLogin', label: 'Alert me on new login from unrecognized device' },
            { key: 'passwordChange', label: 'Alert me when password is changed' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <span className="text-sm text-foreground">{item.label}</span>
              <button
                onClick={() =>
                  setSecurityNotifications({
                    ...securityNotifications,
                    [item.key]: !securityNotifications[item.key as keyof typeof securityNotifications],
                  })
                }
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  securityNotifications[item.key as keyof typeof securityNotifications] ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                    securityNotifications[item.key as keyof typeof securityNotifications] ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
