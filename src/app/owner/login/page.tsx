'use client';

import { useState } from 'react';

export default function OwnerLogin() {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid owner key');
      }

      window.location.href = '/owner';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 rounded-xl border border-input bg-card">
        <h1 className="text-xl font-700 text-foreground">Owner Access</h1>
        <p className="text-sm text-muted-foreground">Enter the owner key to continue.</p>
        {error && (
          <p className="text-sm text-danger bg-danger/10 p-2 rounded">{error}</p>
        )}
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Owner key"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-lg bg-foreground text-background text-sm font-600 disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
