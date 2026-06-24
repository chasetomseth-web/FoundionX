/**
 * MerchantOS Immutable Audit Log System
 * Append-only records for admin actions, payout/subscription/affiliate/product changes, auth events
 */

import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export type AuditAction =
  | 'admin.login' |'admin.logout' |'admin.settings.update' |'payout.created' |'payout.updated' |'payout.cancelled' |'subscription.created' |'subscription.updated' |'subscription.cancelled' |'subscription.paused' |'affiliate.created' |'affiliate.updated' |'affiliate.commission.approved' |'affiliate.commission.rejected' |'product.created' |'product.updated' |'product.deleted' |'inventory.updated' |'order.status.changed' |'order.refunded' |'customer.created' |'customer.updated' |'customer.deleted' |'auth.signup' |'auth.signin' |'auth.signout' |'auth.password.reset' |'webhook.replayed' |'cache.invalidated' |'reconciliation.triggered';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail?: string;
  tenantId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  immutable: true;
}

// ============================================================
// IN-MEMORY AUDIT STORE (last 5000 entries)
// ============================================================

const AUDIT_BUFFER = 5000;
const auditLog: AuditEntry[] = [];
Object.freeze(auditLog); // prevent direct mutation

const _auditLog: AuditEntry[] = [];

export function appendAuditLog(params: {
  actorId: string;
  actorEmail?: string;
  tenantId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): AuditEntry {
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    tenantId: params.tenantId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    before: params.before ? deepFreeze(params.before) : undefined,
    after: params.after ? deepFreeze(params.after) : undefined,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: params.metadata,
    immutable: true,
  };

  Object.freeze(entry);
  _auditLog.push(entry);
  if (_auditLog.length > AUDIT_BUFFER) _auditLog.shift();

  return entry;
}

function deepFreeze<T extends object>(obj: T): T {
  Object.getOwnPropertyNames(obj).forEach(name => {
    const val = (obj as any)[name];
    if (val && typeof val === 'object') deepFreeze(val);
  });
  return Object.freeze(obj);
}

// ============================================================
// QUERY HELPERS
// ============================================================

export function getAuditLog(filters?: {
  tenantId?: string;
  actorId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  since?: Date;
  limit?: number;
}): AuditEntry[] {
  let entries = [..._auditLog].reverse();

  if (filters?.tenantId) entries = entries.filter(e => e.tenantId === filters.tenantId);
  if (filters?.actorId) entries = entries.filter(e => e.actorId === filters.actorId);
  if (filters?.action) entries = entries.filter(e => e.action === filters.action);
  if (filters?.resourceType) entries = entries.filter(e => e.resourceType === filters.resourceType);
  if (filters?.resourceId) entries = entries.filter(e => e.resourceId === filters.resourceId);
  if (filters?.since) entries = entries.filter(e => new Date(e.timestamp) >= filters.since!);

  return entries.slice(0, filters?.limit ?? 100);
}

export function getAuditStats(tenantId?: string) {
  let entries = tenantId ? _auditLog.filter(e => e.tenantId === tenantId) : _auditLog;
  const byAction: Record<string, number> = {};
  const byActor: Record<string, number> = {};

  for (const e of entries) {
    byAction[e.action] = (byAction[e.action] ?? 0) + 1;
    byActor[e.actorId] = (byActor[e.actorId] ?? 0) + 1;
  }

  return {
    total: entries.length,
    byAction,
    topActors: Object.entries(byActor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([actorId, count]) => ({ actorId, count })),
  };
}
