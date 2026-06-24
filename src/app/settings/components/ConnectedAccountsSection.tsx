'use client';

import React from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ConnectedAccountsSection() {
  const handleConnect = (provider: string) => {
    toast.info('Coming Soon', {
      description: `${provider} integration will be available in a future update`,
    });
  };

  const accounts = [
    { id: 'google', name: 'Google', icon: '🔵', description: 'Sign in with Google' },
    { id: 'facebook', name: 'Facebook', icon: '🔷', description: 'Sign in with Facebook' },
    { id: 'apple', name: 'Apple', icon: '⚫', description: 'Sign in with Apple' },
    { id: 'sso', name: 'Enterprise SSO', icon: '🔐', description: 'Single Sign-On for teams' },
  ];

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Link2 size={16} className="text-primary" />
        <h3 className="text-sm font-600 text-foreground">Connected Accounts</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Connect third-party accounts to enable single sign-on and streamline authentication.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{account.icon}</div>
                <div>
                  <h4 className="text-sm font-600 text-foreground">{account.name}</h4>
                  <p className="text-xs text-muted-foreground">{account.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-500 bg-muted text-muted-foreground">
                Not Connected
              </span>
              <button
                onClick={() => handleConnect(account.name)}
                className="text-xs text-primary hover:opacity-80 font-500"
              >
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-info-bg border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-500">
          💡 These integrations are coming soon. Check back for updates!
        </p>
      </div>
    </div>
  );
}