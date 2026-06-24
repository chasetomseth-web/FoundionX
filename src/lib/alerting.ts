/**
 * MerchantOS Alerting Engine
 * Threshold-based triggers, in-app notifications, Brevo email alerts
 */

import crypto from 'crypto';
import { apiMetrics, dbMetrics, cacheMetrics, queueMetrics, webhookMetrics } from './metrics';
import { systemLog } from './logger';

// ============================================================
// TYPES
// ============================================================

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertChannel = 'in_app' | 'email' | 'webhook';

export interface Alert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  tenantId?: string;
  channels: AlertChannel[];
  acknowledged: boolean;
  resolvedAt?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt';
  threshold: number;
  severity: AlertSeverity;
  channels: AlertChannel[];
  cooldownMs: number;
  enabled: boolean;
}

// ============================================================
// DEFAULT ALERT RULES
// ============================================================

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'webhook-failure-spike',
    name: 'Webhook Failure Spike',
    metric: 'webhook.failure_rate',
    condition: 'gt',
    threshold: 5,
    severity: 'critical',
    channels: ['in_app', 'email'],
    cooldownMs: 300000,
    enabled: true,
  },
  {
    id: 'queue-backlog',
    name: 'Queue Backlog High',
    metric: 'queue.backlog',
    condition: 'gt',
    threshold: 1000,
    severity: 'warning',
    channels: ['in_app'],
    cooldownMs: 600000,
    enabled: true,
  },
  {
    id: 'db-latency',
    name: 'DB Latency High',
    metric: 'db.avg_latency',
    condition: 'gt',
    threshold: 300,
    severity: 'warning',
    channels: ['in_app', 'email'],
    cooldownMs: 300000,
    enabled: true,
  },
  {
    id: 'cache-hit-rate',
    name: 'Cache Hit Rate Low',
    metric: 'cache.hit_rate',
    condition: 'lt',
    threshold: 80,
    severity: 'warning',
    channels: ['in_app'],
    cooldownMs: 600000,
    enabled: true,
  },
  {
    id: 'api-error-rate',
    name: 'API Error Rate High',
    metric: 'api.error_rate',
    condition: 'gt',
    threshold: 2,
    severity: 'critical',
    channels: ['in_app', 'email'],
    cooldownMs: 300000,
    enabled: true,
  },
];

// ============================================================
// ALERT STORE
// ============================================================

const alertStore: Alert[] = [];
const lastFiredAt = new Map<string, number>();

export function getAlerts(filters?: { acknowledged?: boolean; severity?: AlertSeverity; limit?: number }): Alert[] {
  let alerts = [...alertStore].reverse();
  if (filters?.acknowledged !== undefined) alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
  if (filters?.severity) alerts = alerts.filter(a => a.severity === filters.severity);
  return alerts.slice(0, filters?.limit ?? 50);
}

export function acknowledgeAlert(id: string): boolean {
  const alert = alertStore.find(a => a.id === id);
  if (!alert) return false;
  alert.acknowledged = true;
  return true;
}

// ============================================================
// ALERT FIRING
// ============================================================

async function fireAlert(rule: AlertRule, currentValue: number): Promise<void> {
  const now = Date.now();
  const lastFired = lastFiredAt.get(rule.id) ?? 0;
  if (now - lastFired < rule.cooldownMs) return; // cooldown

  lastFiredAt.set(rule.id, now);

  const alert: Alert = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    severity: rule.severity,
    title: rule.name,
    message: `${rule.name}: current value ${currentValue.toFixed(2)} ${rule.condition === 'gt' ? '>' : '<'} threshold ${rule.threshold}`,
    metric: rule.metric,
    currentValue,
    threshold: rule.threshold,
    channels: rule.channels,
    acknowledged: false,
  };

  alertStore.push(alert);
  if (alertStore.length > 500) alertStore.shift();

  systemLog.warn(`Alert fired: ${rule.name}`, {
    alertId: alert.id,
    metric: rule.metric,
    currentValue,
    threshold: rule.threshold,
    severity: rule.severity,
  });

  // Send email via Brevo if channel includes email
  if (rule.channels.includes('email') && process.env.BREVO_API_KEY) {
    await sendAlertEmail(alert).catch(err =>
      systemLog.error('Failed to send alert email', { error: { message: String(err) } })
    );
  }
}

async function sendAlertEmail(alert: Alert): Promise<void> {
  const adminEmail = process.env.ALERT_EMAIL ?? process.env.BREVO_SENDER_EMAIL;
  if (!adminEmail) return;

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'MerchantOS Alerts', email: adminEmail },
        to: [{ email: adminEmail }],
        subject: `[${alert.severity.toUpperCase()}] MerchantOS Alert: ${alert.title}`,
        htmlContent: `
          <h2 style="color:${alert.severity === 'critical' ? '#dc2626' : '#d97706'}">
            ${alert.severity.toUpperCase()}: ${alert.title}
          </h2>
          <p>${alert.message}</p>
          <table>
            <tr><td><strong>Metric:</strong></td><td>${alert.metric}</td></tr>
            <tr><td><strong>Current Value:</strong></td><td>${alert.currentValue.toFixed(2)}</td></tr>
            <tr><td><strong>Threshold:</strong></td><td>${alert.threshold}</td></tr>
            <tr><td><strong>Time:</strong></td><td>${alert.timestamp}</td></tr>
          </table>
        `,
      }),
    });
  } catch {
    // Silently fail — alert already stored in-app
  }
}

// ============================================================
// EVALUATION ENGINE (call periodically)
// ============================================================

export async function evaluateAlertRules(): Promise<void> {
  const apiStats = apiMetrics.getStats(300000);
  const dbStats = dbMetrics.getStats(300000);
  const cacheStats = cacheMetrics.getStats(300000);
  const queueStats = queueMetrics.getStats(300000);
  const webhookStats = webhookMetrics.getStats(300000);

  const currentValues: Record<string, number> = {
    'webhook.failure_rate': 100 - webhookStats.successRate,
    'queue.backlog': queueStats.currentBacklog,
    'db.avg_latency': dbStats.avgQueryMs,
    'cache.hit_rate': cacheStats.hitRate,
    'api.error_rate': apiStats.errorRate,
  };

  for (const rule of DEFAULT_RULES) {
    if (!rule.enabled) continue;
    const value = currentValues[rule.metric];
    if (value === undefined) continue;

    const triggered =
      (rule.condition === 'gt' && value > rule.threshold) ||
      (rule.condition === 'lt' && value < rule.threshold && (cacheStats.hitCount + cacheStats.missCount) > 10);

    if (triggered) {
      await fireAlert(rule, value);
    }
  }
}

// ============================================================
// ALERT STATS
// ============================================================

export function getAlertStats() {
  const all = alertStore;
  return {
    total: all.length,
    unacknowledged: all.filter(a => !a.acknowledged).length,
    critical: all.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    warning: all.filter(a => a.severity === 'warning' && !a.acknowledged).length,
  };
}
