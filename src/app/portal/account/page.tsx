'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, MapPin, Lock, Save, CheckCircle, Loader2 } from 'lucide-react';

type CustomerData = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: string;
  addresses: Array<{
    id: string;
    type: string;
    isDefault: boolean;
    firstName: string | null;
    lastName: string | null;
    address1: string;
    address2: string | null;
    city: string;
    state: string | null;
    zip: string | null;
    country: string;
    phone: string | null;
  }>;
};

export default function PortalAccountPage() {
  const router = useRouter();
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetch('/api/auth/customer/me')
      .then((r) => {
        if (!r.ok) throw new Error('Not authenticated');
        return r.json();
      })
      .then((d) => {
        if (d.customer) {
          setData(d.customer);
          setFirstName(d.customer.firstName ?? '');
          setLastName(d.customer.lastName ?? '');
          setPhone(d.customer.phone ?? '');
        } else {
          // If /api/auth/customer/me returns dashboard data, extract customer
          if (d.id) {
            setData(d);
            setFirstName(d.firstName ?? '');
            setLastName(d.lastName ?? '');
            setPhone(d.phone ?? '');
          }
        }
      })
      .catch(() => router.push('/portal/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/customer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* noop */ }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    try {
      const res = await fetch('/api/auth/customer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setPasswordError(d.error ?? 'Failed to change password');
      }
    } catch { setPasswordError('Failed to change password'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please sign in to view your account.</p>
        <Link href="/portal/login" className="text-primary hover:underline mt-2 inline-block">Sign In</Link>
      </div>
    );
  }

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and password</p>
      </div>

      {/* Profile Section */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">First Name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-500 text-foreground block mb-1">Last Name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-xs font-500 text-foreground block mb-1">Email</label>
          <input value={data.email} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
        </div>

        <div>
          <label className="text-xs font-500 text-foreground block mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" className={inputCls} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {saved && <span className="text-xs text-success flex items-center gap-1"><CheckCircle size={12} /> Saved</span>}
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
        </div>

        {passwordError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{passwordError}</div>
        )}

        <div>
          <label className="text-xs font-500 text-foreground block mb-1">Current Password</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-500 text-foreground block mb-1">New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-500 text-foreground block mb-1">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={!currentPassword || !newPassword}
          className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Lock size={13} /> Update Password
        </button>
      </div>

      {/* Shipping Addresses */}
      {data.addresses && data.addresses.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Saved Addresses</h2>
          </div>
          <div className="divide-y divide-border">
            {data.addresses.map((addr) => (
              <div key={addr.id} className="py-3 text-sm">
                <p className="font-medium text-foreground">
                  {addr.firstName} {addr.lastName}
                  {addr.isDefault && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>}
                </p>
                <p className="text-muted-foreground">{addr.address1}{addr.address2 ? `, ${addr.address2}` : ''}</p>
                <p className="text-muted-foreground">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zip}</p>
                <p className="text-muted-foreground">{addr.country}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}