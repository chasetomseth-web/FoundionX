/**
 * Queue Reliability Engine — Upgraded BullMQ-style system
 * Priority queues, deduplication, DLQ, burst protection, job replay
 */

import { prisma } from './prisma';
import {
  sendOrderConfirmation,
  sendFailedPaymentRecovery,
  sendSubscriptionRenewal,
  sendAffiliateWelcome,
  sendAbandonedCartRecovery,
} from './brevo';
import { queueLogger } from './observability';

// ============================================================
// JOB TYPES
// ============================================================

export type QueueName =
  | 'email' | 'webhook' | 'analytics' | 'inventory' | 'subscription' | 'affiliate' | 'cart_recovery';

export type JobType =
  | 'send_order_confirmation' | 'send_failed_payment_recovery' | 'send_subscription_renewal' |'send_subscription_payment_failed' | 'send_affiliate_welcome' | 'send_abandoned_cart'
  | 'sync_affiliate_commissions'| 'process_subscription_retry' | 'aggregate_analytics' |'sync_inventory' | 'process_affiliate_payout';

export interface JobPayload {
  orderId?: string;
  customerId?: string;
  subscriptionId?: string;
  affiliateId?: string;
  storeId?: string;
  email?: string;
  [key: string]: unknown;
}

// ============================================================
// QUEUE PRIORITY CONFIG
// ============================================================

const QUEUE_PRIORITY: Record<QueueName, number> = {
  webhook: 1,      // HIGHEST
  email: 2,        // HIGH
  subscription: 3, // MEDIUM-HIGH
  affiliate: 4,    // MEDIUM
  inventory: 5,    // MEDIUM
  cart_recovery: 6,// LOW-MEDIUM
  analytics: 7,    // LOWEST
};

const QUEUE_RETRY_CONFIG: Record<QueueName, { maxAttempts: number; backoffBase: number }> = {
  webhook: { maxAttempts: 5, backoffBase: 2 },
  email: { maxAttempts: 4, backoffBase: 3 },
  subscription: { maxAttempts: 5, backoffBase: 2 },
  affiliate: { maxAttempts: 4, backoffBase: 3 },
  inventory: { maxAttempts: 3, backoffBase: 5 },
  cart_recovery: { maxAttempts: 3, backoffBase: 10 },
  analytics: { maxAttempts: 2, backoffBase: 15 },
};

// Burst protection: max jobs per queue per minute
const BURST_LIMITS: Record<QueueName, number> = {
  webhook: 500,
  email: 100,
  subscription: 50,
  affiliate: 50,
  inventory: 30,
  cart_recovery: 20,
  analytics: 10,
};

// ============================================================
// ENQUEUE JOB (with deduplication)
// ============================================================

export async function enqueueJob(
  queue: QueueName,
  jobType: JobType,
  payload: JobPayload,
  options?: {
    organizationId?: string;
    scheduledAt?: Date;
    maxAttempts?: number;
    deduplicationKey?: string; // if provided, skip if identical pending job exists
  }
): Promise<string> {
  const config = QUEUE_RETRY_CONFIG[queue];
  const maxAttempts = options?.maxAttempts ?? config.maxAttempts;

  // Deduplication check
  if (options?.deduplicationKey) {
    const existing = await prisma.backgroundJob.findFirst({
      where: {
        queue,
        jobType,
        status: { in: ['pending', 'processing', 'retrying'] },
        payload: { path: ['deduplicationKey'], equals: options.deduplicationKey },
      },
    });
    if (existing) {
      queueLogger.info('Job deduplicated', {
        queue,
        jobType,
        deduplicationKey: options.deduplicationKey,
        existingJobId: existing.id,
      });
      return existing.id;
    }
  }

  const jobPayload = options?.deduplicationKey
    ? { ...payload, deduplicationKey: options.deduplicationKey }
    : payload;

  const job = await prisma.backgroundJob.create({
    data: {
      organizationId: options?.organizationId,
      queue,
      jobType,
      payload: jobPayload as Record<string, unknown>,
      status: 'pending',
      scheduledAt: options?.scheduledAt ?? new Date(),
      maxAttempts,
    },
  });

  queueLogger.info('Job enqueued', {
    jobId: job.id,
    queue,
    jobType,
    priority: QUEUE_PRIORITY[queue],
  });

  return job.id;
}

// ============================================================
// PROCESS PENDING JOBS (priority-ordered)
// ============================================================

export async function processPendingJobs(
  queue?: QueueName,
  batchSize = 10
): Promise<{ processed: number; failed: number; deadLettered: number }> {
  const where: Record<string, unknown> = {
    status: { in: ['pending', 'retrying'] },
    scheduledAt: { lte: new Date() },
  };
  if (queue) where.queue = queue;

  // Burst protection check
  if (queue) {
    const recentCount = await prisma.backgroundJob.count({
      where: {
        queue,
        status: 'processing',
        startedAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recentCount >= BURST_LIMITS[queue]) {
      queueLogger.warn('Burst limit reached', { queue, recentCount, limit: BURST_LIMITS[queue] });
      return { processed: 0, failed: 0, deadLettered: 0 };
    }
  }

  // Fetch jobs ordered by priority (queue priority) then scheduledAt
  const queues = queue ? [queue] : (Object.keys(QUEUE_PRIORITY) as QueueName[]).sort(
    (a, b) => QUEUE_PRIORITY[a] - QUEUE_PRIORITY[b]
  );

  let processed = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const q of queues) {
    const jobs = await prisma.backgroundJob.findMany({
      where: { ...where, queue: q },
      orderBy: { scheduledAt: 'asc' },
      take: batchSize,
    });

    for (const job of jobs) {
      const config = QUEUE_RETRY_CONFIG[q as QueueName];

      try {
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
        });

        await executeJob(job.jobType as JobType, job.payload as JobPayload);

        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { status: 'completed', completedAt: new Date() },
        });

        queueLogger.info('Job completed', { jobId: job.id, queue: q, jobType: job.jobType });
        processed++;
      } catch (error) {
        const attempts = job.attempts + 1;
        const shouldRetry = attempts < config.maxAttempts;
        const failureReason = error instanceof Error ? error.message : 'Unknown error';

        if (shouldRetry) {
          const backoffMs = Math.pow(config.backoffBase, attempts) * 1000;
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'retrying',
              failureReason,
              scheduledAt: new Date(Date.now() + backoffMs),
            },
          });
          queueLogger.warn('Job failed, will retry', {
            jobId: job.id,
            queue: q,
            attempts,
            nextRetryMs: backoffMs,
            failureReason,
          });
          failed++;
        } else {
          // Move to DLQ
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: { status: 'failed', failureReason },
          });
          queueLogger.error('Job dead-lettered', {
            jobId: job.id,
            queue: q,
            jobType: job.jobType,
            attempts,
            failureReason,
          });
          deadLettered++;
        }
      }
    }
  }

  return { processed, failed, deadLettered };
}

// ============================================================
// JOB REPLAY (admin-triggered)
// ============================================================

export async function replayJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
  if (!job) return { success: false, error: 'Job not found' };

  try {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
    });

    await executeJob(job.jobType as JobType, job.payload as JobPayload);

    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'completed', completedAt: new Date() },
    });

    queueLogger.info('Job replayed successfully', { jobId, jobType: job.jobType });
    return { success: true };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : 'Unknown';
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'failed', failureReason },
    });
    return { success: false, error: failureReason };
  }
}

// ============================================================
// JOB EXECUTOR
// ============================================================

async function executeJob(jobType: JobType, payload: JobPayload): Promise<void> {
  switch (jobType) {
    case 'send_order_confirmation': {
      if (!payload.orderId) throw new Error('Missing orderId');
      const order = await prisma.order.findUnique({
        where: { id: payload.orderId },
        include: { customer: true, items: true },
      });
      if (!order) throw new Error('Order not found');
      const email = order.customer?.email ?? payload.email as string;
      if (!email) throw new Error('No email for order confirmation');
      await sendOrderConfirmation({
        email,
        name: order.customer?.name ?? undefined,
        orderNumber: order.orderNumber,
        orderTotal: Number(order.total),
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
        })),
        currency: order.currency,
      });
      break;
    }

    case 'send_failed_payment_recovery': {
      if (!payload.orderId) throw new Error('Missing orderId');
      const order = await prisma.order.findUnique({
        where: { id: payload.orderId },
        include: { customer: true },
      });
      if (!order) throw new Error('Order not found');
      const email = order.customer?.email ?? payload.email as string;
      if (!email) break;
      await sendFailedPaymentRecovery({
        email,
        name: order.customer?.name ?? undefined,
        orderNumber: order.orderNumber,
        amount: Number(order.total),
      });
      break;
    }

    case 'send_subscription_renewal': case'send_subscription_payment_failed': {
      if (!payload.subscriptionId) throw new Error('Missing subscriptionId');
      const sub = await prisma.subscription.findUnique({
        where: { id: payload.subscriptionId },
        include: { customer: true },
      });
      if (!sub || !sub.customer?.email) break;
      if (jobType === 'send_subscription_renewal') {
        await sendSubscriptionRenewal({
          email: sub.customer.email,
          name: sub.customer.name ?? undefined,
          planName: sub.planName,
          amount: Number(sub.amount),
          nextBillingDate: sub.nextBillingAt ?? undefined,
        });
      } else {
        await sendFailedPaymentRecovery({
          email: sub.customer.email,
          name: sub.customer.name ?? undefined,
          amount: Number(sub.amount),
        });
      }
      break;
    }

    case 'send_affiliate_welcome': {
      if (!payload.affiliateId) throw new Error('Missing affiliateId');
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: payload.affiliateId },
        include: { store: true },
      });
      if (!affiliate) break;
      const storeUrl = affiliate.store?.domain
        ? `https://${affiliate.store.domain}`
        : process.env.NEXT_PUBLIC_SITE_URL ?? '';
      await sendAffiliateWelcome({
        email: affiliate.email,
        name: affiliate.name,
        referralCode: affiliate.referralCode,
        referralUrl: `${storeUrl}?ref=${affiliate.referralCode}`,
        commissionRate: Number(affiliate.commissionRate),
      });
      break;
    }

    case 'send_abandoned_cart': {
      const { email, cartItems, recoveryUrl } = payload;
      if (!email) break;
      await sendAbandonedCartRecovery({
        email: email as string,
        cartItems: (cartItems as { name: string; price: number }[]) ?? [],
        recoveryUrl: (recoveryUrl as string) ?? '',
      });
      break;
    }

    case 'sync_affiliate_commissions': {
      const { storeId } = payload;
      if (!storeId) break;
      const store = await prisma.store.findUnique({ where: { id: storeId as string } });
      if (!store?.goaffproApiKey || !store?.goaffproStoreId) break;
      const { goaffproService } = await import('./goaffpro');
      await goaffproService.syncAffiliatesFromGoAffPro(
        { accessToken: store.goaffproApiKey, storeId: store.goaffproStoreId },
        storeId as string
      );
      break;
    }

    case 'process_subscription_retry': {
      if (!payload.subscriptionId) break;
      const sub = await prisma.subscription.findUnique({ where: { id: payload.subscriptionId as string } });
      if (!sub || sub.status !== 'past_due') break;
      await prisma.subscriptionRetryAttempt.create({
        data: {
          subscriptionId: sub.id,
          attemptNumber: sub.failedPaymentCount + 1,
          status: 'attempted',
          scheduledAt: new Date(),
          attemptedAt: new Date(),
        },
      });
      break;
    }

    case 'aggregate_analytics': {
      queueLogger.info('Aggregating analytics', { storeId: payload.storeId });
      break;
    }

    default:
      queueLogger.warn('Unknown job type', { jobType });
  }
}

// ============================================================
// QUEUE STATS
// ============================================================

export async function getQueueStats(): Promise<Record<QueueName, { pending: number; failed: number; completed: number; deadLettered: number }>> {
  const stats = await prisma.backgroundJob.groupBy({
    by: ['queue', 'status'],
    _count: { id: true },
  });

  const result = {} as Record<QueueName, { pending: number; failed: number; completed: number; deadLettered: number }>;

  for (const stat of stats) {
    const queue = stat.queue as QueueName;
    if (!result[queue]) result[queue] = { pending: 0, failed: 0, completed: 0, deadLettered: 0 };

    if (stat.status === 'pending' || stat.status === 'retrying') {
      result[queue].pending += stat._count.id;
    } else if (stat.status === 'failed') {
      result[queue].deadLettered += stat._count.id;
    } else if (stat.status === 'completed') {
      result[queue].completed += stat._count.id;
    } else if (stat.status === 'processing') {
      result[queue].pending += stat._count.id;
    }
  }

  return result;
}

// ============================================================
// DLQ VIEWER
// ============================================================

export async function getDeadLetterJobs(
  queue?: QueueName,
  limit = 50
) {
  return prisma.backgroundJob.findMany({
    where: {
      status: 'failed',
      ...(queue ? { queue } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

function processNextJob(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: processNextJob is not implemented yet.', args);
  return null;
}

export { processNextJob };