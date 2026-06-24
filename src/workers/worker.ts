/**
 * MerchantOS — Worker Deployment Architecture
 * Production worker entrypoint for BullMQ job processing
 * Handles: email, webhooks, analytics, affiliate, subscriptions, cart recovery
 */

import { processNextJob, QueueName } from '../lib/queue';
import { assertEnvironment } from '../lib/env-validation';
import { createLogger } from '../lib/logger';

const logger = createLogger('worker');

// ============================================================
// WORKER CONFIGURATION
// ============================================================

const QUEUES_TO_PROCESS: QueueName[] = [
  'email',
  'webhook',
  'analytics',
  'inventory',
  'subscription',
  'affiliate',
  'cart_recovery',
];

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10);
const POLL_INTERVAL_MS = 1000;
const SHUTDOWN_TIMEOUT_MS = 30000;

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

let isShuttingDown = false;
let activeJobs = 0;

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Worker received ${signal} — initiating graceful shutdown`, {
    service: 'worker',
    activeJobs,
  });

  isShuttingDown = true;

  const shutdownStart = Date.now();

  // Wait for active jobs to complete (up to SHUTDOWN_TIMEOUT_MS)
  while (activeJobs > 0) {
    const elapsed = Date.now() - shutdownStart;
    if (elapsed > SHUTDOWN_TIMEOUT_MS) {
      logger.warn(`Shutdown timeout reached with ${activeJobs} active jobs — forcing exit`, {
        service: 'worker',
      });
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  logger.info('Worker shutdown complete', { service: 'worker' });
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================
// WORKER LOOP
// ============================================================

async function runWorker(): Promise<void> {
  // Validate environment before starting
  assertEnvironment();

  logger.info('MerchantOS Worker starting', {
    service: 'worker',
    queues: QUEUES_TO_PROCESS,
    concurrency: CONCURRENCY,
    nodeVersion: process.version,
    pid: process.pid,
  });

  // Round-robin across queues
  let queueIndex = 0;

  const workerLoop = async (): Promise<void> => {
    if (isShuttingDown) return;

    if (activeJobs >= CONCURRENCY) {
      // At capacity — wait before polling again
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      setImmediate(workerLoop);
      return;
    }

    const queue = QUEUES_TO_PROCESS[queueIndex % QUEUES_TO_PROCESS.length];
    queueIndex++;

    try {
      activeJobs++;
      const processed = await processNextJob(queue);
      if (!processed) {
        // No job available — back off slightly
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (error) {
      logger.error('Worker loop error', {
        service: 'worker',
        queue,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      activeJobs--;
    }

    if (!isShuttingDown) {
      setImmediate(workerLoop);
    }
  };

  // Start N concurrent worker loops
  for (let i = 0; i < CONCURRENCY; i++) {
    setImmediate(workerLoop);
  }

  logger.info(`Worker running with ${CONCURRENCY} concurrent slots`, {
    service: 'worker',
  });
}

// ============================================================
// ENTRYPOINT
// ============================================================

runWorker().catch((error) => {
  console.error('Fatal worker error:', error);
  process.exit(1);
});
