'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Loader2, Save, CheckCircle, Download, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PrivacySection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [gdprSettings, setGdprSettings] = useState({
    allowDataCollection: true,
    allowMarketing: false,
    allowThirdParty: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/store/settings');
      const data = await res.json();
      if (data.store?.gdprSettings) {
        setGdprSettings({ ...gdprSettings, ...data.store.gdprSettings });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
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
        body: JSON.stringify({ gdprSettings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/privacy/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      toast.error('Please type the confirmation text exactly');
      return;
    }
    setDeleting(true);
    try {
      await fetch('/api/store/delete', { method: 'DELETE' });
      toast.success('Account scheduled for deletion');
      // Would typically sign out here
      window.location.href = '/';
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggleCls = 'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200';

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-primary" />
        <h3 className="text-sm font-600 text-foreground">Privacy & Data</h3>
      </div>

      {/* Export Data */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-600 text-foreground mb-2">Export Your Data</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Download a copy of all your orders, customers, and product data in JSON format.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {exporting ? 'Exporting...' : 'Export Data'}
        </button>
      </div>

      {/* GDPR Settings */}
      <div>
        <h4 className="text-sm font-600 text-foreground mb-3">GDPR & Privacy Controls</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-500 text-foreground">Allow Data Collection</p>
              <p className="text-xs text-muted-foreground">Store customer data for order fulfillment</p>
            </div>
            <button
              onClick={() => setGdprSettings({ ...gdprSettings, allowDataCollection: !gdprSettings.allowDataCollection })}
              className={`${toggleCls} ${gdprSettings.allowDataCollection ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  gdprSettings.allowDataCollection ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-500 text-foreground">Allow Marketing Communications</p>
              <p className="text-xs text-muted-foreground">Send promotional emails to customers</p>
            </div>
            <button
              onClick={() => setGdprSettings({ ...gdprSettings, allowMarketing: !gdprSettings.allowMarketing })}
              className={`${toggleCls} ${gdprSettings.allowMarketing ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  gdprSettings.allowMarketing ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-500 text-foreground">Share with Third Parties</p>
              <p className="text-xs text-muted-foreground">Allow data sharing with analytics providers</p>
            </div>
            <button
              onClick={() => setGdprSettings({ ...gdprSettings, allowThirdParty: !gdprSettings.allowThirdParty })}
              className={`${toggleCls} ${gdprSettings.allowThirdParty ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  gdprSettings.allowThirdParty ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving...' : 'Save Privacy Settings'}
        </button>
        {saved && (
          <span className="text-xs text-success flex items-center gap-1">
            <CheckCircle size={12} /> Saved successfully
          </span>
        )}
      </div>

      {/* Delete Account */}
      <div className="border-t border-danger/20 pt-6">
        <h4 className="text-sm font-600 text-danger mb-2">Delete Account</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-danger/30 text-danger text-sm font-500 rounded-lg hover:bg-danger/10 transition-colors"
        >
          <Trash2 size={13} />
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-danger/30 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-600 text-danger">Confirm Account Deletion</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-danger-bg border border-danger/20 rounded-lg p-3 text-xs text-danger">
                ⚠️ This will permanently delete your account, all orders, customers, and product data. This action cannot be undone.
              </div>
              <div>
                <label className="text-xs font-500 text-foreground block mb-1">
                  Type "DELETE MY ACCOUNT" to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-danger transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmation !== 'DELETE MY ACCOUNT'}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  className="px-4 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}