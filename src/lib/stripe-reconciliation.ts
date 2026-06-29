/**
 * Stripe Reconciliation Service
 * Periodic DB ↔ Stripe source-of-truth correction with audit trail
 */

import { prisma } from './prisma';
import { reconcileLogger } from './observability';
import Stripe from 'stripe';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

// ============================================================
// MAIN RECONCILIATION JOB
// ============================================================

export interface ReconciliationResult {
  runId: string;
  ordersChecked: number;
  ordersMismatched: number;
  ordersFixed: number;
  subsChecked: number;
  subsMismatched: number;
  subsFixed: number;
  errors: string[];
  durationMs: number;
}

export async function runStripeReconciliation(
  options: {
    organizationId?: string;
    storeId?: string;
    triggeredBy?: string;
    dryRun?: boolean;
  } = {}
): Promise<ReconciliationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let ordersChecked = 0;
  let ordersMismatched = 0;
  let ordersFixed = 0;
  let subsChecked = 0;
  let subsMismatched = 0;
  let subsFixed = 0;

  // Create reconciliation log entry
  const logEntry = await prisma.stripeReconciliationLog.create({
    data: {
      organizationId: options.organizationId,
      storeId: options.storeId,
      status: 'running',
      triggeredBy: options.triggeredBy ?? 'scheduler',
    },
  });

  reconcileLogger.info('Reconciliation started', {
    runId: logEntry.id,
    organizationId: options.organizationId,
    storeId: options.storeId,
    dryRun: options.dryRun,
  });

  try {
    // ── Reconcile Orders ──────────────────────────────────
    const orderResult = await reconcileOrders(options, errors);
    ordersChecked = orderResult.checked;
    ordersMismatched = orderResult.mismatched;
    ordersFixed = orderResult.fixed;

    // ── Reconcile Subscriptions ───────────────────────────
    const subResult = await reconcileSubscriptions(options, errors);
    subsChecked = subResult.checked;
    subsMismatched = subResult.mismatched;
    subsFixed = subResult.fixed;

    const durationMs = Date.now() - startTime;

    await prisma.stripeReconciliationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'completed',
        ordersChecked,
        ordersMismatched,
        ordersFixed,
        subsChecked,
        subsMismatched,
        subsFixed,
        errors: errors.length > 0 ? errors : undefined,
        durationMs,
      },
    });

    reconcileLogger.info('Reconciliation completed', {
      runId: logEntry.id,
      ordersChecked,
      ordersMismatched,
      ordersFixed,
      subsChecked,
      subsMismatched,
      subsFixed,
      durationMs,
    });

    return {
      runId: logEntry.id,
      ordersChecked,
      ordersMismatched,
      ordersFixed,
      subsChecked,
      subsMismatched,
      subsFixed,
      errors,
      durationMs,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errMsg);

    await prisma.stripeReconciliationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'failed',
        errors,
        durationMs: Date.now() - startTime,
      },
    });

    reconcileLogger.error('Reconciliation failed', { runId: logEntry.id, error: errMsg });

    return {
      runId: logEntry.id,
      ordersChecked,
      ordersMismatched,
      ordersFixed,
      subsChecked,
      subsMismatched,
      subsFixed,
      errors,
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================
// ORDER RECONCILIATION
// ============================================================

async function reconcileOrders(
  options: { organizationId?: string; storeId?: string; dryRun?: boolean },
  errors: string[]
): Promise<{ checked: number; mismatched: number; fixed: number }> {
  let checked = 0;
  let mismatched = 0;
  let fixed = 0;

  // Get orders with Stripe payment intents from last 30 days
  const orders = await prisma.order.findMany({
    where: {
      stripePaymentIntentId: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      ...(options.storeId ? { storeId: options.storeId } : {}),
    },
    take: 200,
  });

  for (const order of orders) {
    if (!order.stripePaymentIntentId) continue;
    checked++;

    const stripeClient = getStripeClient();
    if (!stripeClient) {
      errors.push('Stripe not configured');
      continue;
    }

    try {
      const pi = await stripeClient.paymentIntents.retrieve(order.stripePaymentIntentId);

      const expectedStatus = mapStripeStatusToPaymentStatus(pi.status);
      if (order.paymentStatus !== expectedStatus) {
        mismatched++;
        reconcileLogger.warn('Order payment status mismatch', {
          orderId: order.id,
          dbStatus: order.paymentStatus,
          stripeStatus: pi.status,
          expectedStatus,
        });

        if (!options.dryRun) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: expectedStatus },
          });
          fixed++;
        }
      }

      // Check amount mismatch
      const stripeAmount = pi.amount / 100;
      if (Math.abs(Number(order.total) - stripeAmount) > 0.01) {
        mismatched++;
        reconcileLogger.warn('Order amount mismatch', {
          orderId: order.id,
          dbTotal: order.total,
          stripeAmount,
        });
      }
    } catch (err) {
      const msg = `Order ${order.id}: ${err instanceof Error ? err.message : 'Unknown'}`;
      errors.push(msg);
      reconcileLogger.error('Order reconciliation error', { orderId: order.id, error: msg });
    }
  }

  return { checked, mismatched, fixed };
}

// ============================================================
// SUBSCRIPTION RECONCILIATION
// ============================================================

async function reconcileSubscriptions(
  options: { organizationId?: string; storeId?: string; dryRun?: boolean },
  errors: string[]
): Promise<{ checked: number; mismatched: number; fixed: number }> {
  let checked = 0;
  let mismatched = 0;
  let fixed = 0;

  const subscriptions = await prisma.subscription.findMany({
    where: {
      stripeSubscriptionId: { not: null },
      status: { not: 'canceled' },
      ...(options.storeId ? { storeId: options.storeId } : {}),
    },
    take: 200,
  });

  for (const sub of subscriptions) {
    if (!sub.stripeSubscriptionId) continue;
    checked++;

    const stripeClient = getStripeClient();
    if (!stripeClient) {
      errors.push('Stripe not configured');
      continue;
    }

    try {
      const stripeSub = await stripeClient.subscriptions.retrieve(sub.stripeSubscriptionId);

      const expectedStatus = mapStripeSubStatus(stripeSub.status);
      if (sub.status !== expectedStatus) {
        mismatched++;
        reconcileLogger.warn('Subscription status mismatch', {
          subscriptionId: sub.id,
          dbStatus: sub.status,
          stripeStatus: stripeSub.status,
          expectedStatus,
        });

        if (!options.dryRun) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: expectedStatus,
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            },
          });
          fixed++;
        }
      }
    } catch (err) {
      const msg = `Subscription ${sub.id}: ${err instanceof Error ? err.message : 'Unknown'}`;
      errors.push(msg);
      reconcileLogger.error('Subscription reconciliation error', { subscriptionId: sub.id, error: msg });
    }
  }

  return { checked, mismatched, fixed };
}

// ============================================================
// STATUS MAPPERS
// ============================================================

function mapStripeStatusToPaymentStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    succeeded: 'paid',
    requires_payment_method: 'failed',
    requires_confirmation: 'pending',
    requires_action: 'pending',
    processing: 'pending',
    canceled: 'failed',
  };
  return map[stripeStatus] ?? 'pending';
}

function mapStripeSubStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    paused: 'paused',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    unpaid: 'past_due',
  };
  return map[stripeStatus] ?? stripeStatus;
}

// ============================================================
// RECONCILIATION HISTORY
// ============================================================

export async function getReconciliationHistory(
  organizationId?: string,
  limit = 20
) {
  return prisma.stripeReconciliationLog.findMany({
    where: organizationId ? { organizationId } : {},
    orderBy: { runAt: 'desc' },
    take: limit,
  });
}
