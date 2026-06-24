import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/events/stream
 * Server-Sent Events endpoint for real-time dashboard updates
 */
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      // Send initial connection event
      send('connected', { timestamp: new Date().toISOString() });

      // Poll for recent events every 15 seconds
      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const store = await prisma.store.findFirst({
            where: { organizationId: session.organizationId },
          });
          if (!store) return;

          const since = new Date(Date.now() - 20 * 1000); // last 20s

          // Check for new orders
          const newOrders = await prisma.order.count({
            where: { storeId: store.id, createdAt: { gte: since } },
          });

          // Check for new webhook events
          const newWebhooks = await prisma.webhookEvent.count({
            where: {
              createdAt: { gte: since },
              source: { in: ['stripe', 'goaffpro'] },
            },
          });

          // Check for failed payments
          const failedPayments = await prisma.order.count({
            where: {
              storeId: store.id,
              paymentStatus: 'failed',
              updatedAt: { gte: since },
            },
          });

          if (newOrders > 0) {
            send('new_orders', { count: newOrders, timestamp: new Date().toISOString() });
          }

          if (newWebhooks > 0) {
            send('webhook_events', { count: newWebhooks, timestamp: new Date().toISOString() });
          }

          if (failedPayments > 0) {
            send('failed_payments', { count: failedPayments, timestamp: new Date().toISOString() });
          }

          // Always send heartbeat
          send('heartbeat', { timestamp: new Date().toISOString() });
        } catch (err) {
          console.error('[SSE] Poll error:', err);
        }
      }, 15000);

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
