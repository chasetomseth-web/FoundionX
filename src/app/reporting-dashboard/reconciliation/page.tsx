/**
 * Reporting Dashboard — Stripe Reconciliation Page
 * Provides UI for running reconciliation and viewing history
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  History,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface ReconciliationRun {
  id: string;
  runAt: string;
  status: string;
  ordersChecked: number;
  ordersMismatched: number;
  ordersFixed: number;
  subsChecked: number;
  subsMismatched: number;
  subsFixed: number;
  errors: string[] | null;
  durationMs: number;
  triggeredBy: string;
}

export default function ReconciliationPage() {
  const [history, setHistory] = useState<ReconciliationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<ReconciliationRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reconciliation?limit=20');
      const json = await res.json();
      setHistory(json.history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRun = async () => {
    setRunning(true);
    setRunResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Reconciliation failed');
      setRunResult(json);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-700 text-foreground">Stripe Reconciliation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare your database records against Stripe to detect and fix mismatches
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-600 hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {running ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Play size={15} />
          )}
          {running ? 'Running…' : 'Run Reconciliation'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <XCircle size={15} />
          {error}
        </div>
      )}

      {/* Latest run result */}
      {runResult && (
        <div className="mb-6 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            {runResult.status === 'completed' ? (
              <CheckCircle size={18} className="text-success" />
            ) : (
              <AlertTriangle size={18} className="text-warning" />
            )}
            <span className="font-600 text-foreground">
              {runResult.status === 'completed' ? 'Reconciliation completed' : 'Reconciliation finished with issues'}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {((runResult.durationMs ?? 0) / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Orders Checked</p>
              <p className="text-lg font-700 text-foreground">{runResult.ordersChecked}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mismatched</p>
              <p className="text-lg font-700 text-warning">{runResult.ordersMismatched}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fixed</p>
              <p className="text-lg font-700 text-success">{runResult.ordersFixed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subs Checked</p>
              <p className="text-lg font-700 text-foreground">{runResult.subsChecked}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mismatched</p>
              <p className="text-lg font-700 text-warning">{runResult.subsMismatched}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fixed</p>
              <p className="text-lg font-700 text-success">{runResult.subsFixed}</p>
            </div>
          </div>
          {runResult.errors && runResult.errors.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-xs font-600 text-red-700 mb-1">Errors:</p>
              {runResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-muted-foreground" />
          <h2 className="text-base font-600 text-foreground">Reconciliation History</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <ShieldCheck size={36} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No reconciliation runs yet. Click "Run Reconciliation" to start.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-500 text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-500 text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-500 text-muted-foreground">Orders</th>
                    <th className="text-left px-4 py-3 font-500 text-muted-foreground">Mismatches</th>
                    <th className="text-left px-4 py-3 font-500 text-muted-foreground">Fixed</th>
                    <th className="text-left px-4 py-3 font-500 text-muted-foreground">Subs</th>
                    <th className="text-left px-4 py-3 font-500 text-muted-foreground">Duration</th>
                    <th className="text-left px-4 py-3 font-500 text-muted-foreground">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((run) => (
                    <tr key={run.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-foreground">
                        {new Date(run.runAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-500 px-2 py-0.5 rounded-full ${
                            run.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : run.status === 'running'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{run.ordersChecked}</td>
                      <td className="px-4 py-3">
                        {run.ordersMismatched > 0 ? (
                          <span className="text-warning font-600">{run.ordersMismatched}</span>
                        ) : (
                          <span className="text-success">{run.ordersMismatched}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">{run.ordersFixed}</td>
                      <td className="px-4 py-3 text-foreground">{run.subsChecked}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {((run.durationMs ?? 0) / 1000).toFixed(1)}s
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{run.triggeredBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}