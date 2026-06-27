import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DEBUG ROUTE: Simulates and traces a complete checkout flow
 * 
 * Query params:
 * - storeId: the store to test with
 * - testMode: 'idempotency' | 'affiliate' | 'coupon' | 'full'
 * 
 * Example: GET /api/debug/checkout-test?storeId=store_123&testMode=full
 */
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  const testMode = request.nextUrl.searchParams.get('testMode') || 'full';

  if (!storeId) {
    return NextResponse.json({ error: 'storeId required' }, { status: 400 });
  }

  const trace: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    testMode,
    storeId,
    steps: [] as any[],
  };

  try {
    // STEP 1: Check if store exists
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    trace.steps.push({
      step: 'Store lookup',
      status: store ? 'success' : 'not_found',
      result: store ? { id: store.id, name: store.name } : null,
    });

    if (!store) {
      return NextResponse.json(trace, { status: 404 });
    }

    // STEP 2: Check Order count before test
    const ordersBefore = await prisma.order.count({ where: { storeId } });
    trace.steps.push({
      step: 'Orders count before',
      status: 'success',
      result: { count: ordersBefore },
    });

    // STEP 3: Check CheckoutSession count before test
    const sessionsBefore = await prisma.checkoutSession.count({ where: { storeId } });
    trace.steps.push({
      step: 'CheckoutSessions count before',
      status: 'success',
      result: { count: sessionsBefore },
    });

    // STEP 4: Create test Order manually (simulating what checkout API does)
    const testOrder = await prisma.order.create({
      data: {
        storeId,
        orderNumber: `TEST-${Date.now()}`,
        status: 'pending',
        paymentStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        currency: 'USD',
        subtotal: 99.99,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 99.99,
        metadata: {
          testMode,
          debug: true,
        },
        items: {
          create: [
            {
              name: 'Test Product',
              quantity: 1,
              price: 99.99,
              total: 99.99,
              metadata: { debug: true },
            },
          ],
        },
      },
      include: { items: true },
    });

    trace.steps.push({
      step: 'Test Order created',
      status: 'success',
      result: {
        orderId: testOrder.id,
        orderNumber: testOrder.orderNumber,
        status: testOrder.status,
        paymentStatus: testOrder.paymentStatus,
        itemCount: testOrder.items.length,
      },
    });

    // STEP 5: Create CheckoutSession
    const idempotencyKey = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const checkoutSession = await prisma.checkoutSession.create({
      data: {
        storeId,
        orderId: testOrder.id,
        idempotencyKey,
        mode: 'payment',
        status: 'pending',
        metadata: { debug: true, testMode },
      },
    });

    trace.steps.push({
      step: 'CheckoutSession created',
      status: 'success',
      result: {
        sessionId: checkoutSession.id,
        idempotencyKey,
        status: checkoutSession.status,
      },
    });

    // STEP 6: Test idempotency - try to fetch with same idempotencyKey
    if (testMode === 'idempotency' || testMode === 'full') {
      const cachedSession = await prisma.checkoutSession.findFirst({
        where: { idempotencyKey, storeId },
      });

      trace.steps.push({
        step: 'Idempotency check (fetch by idempotencyKey)',
        status: cachedSession?.id === checkoutSession.id ? 'success' : 'failed',
        result: {
          cachedSessionId: cachedSession?.id,
          matches: cachedSession?.id === checkoutSession.id,
        },
      });
    }

    // STEP 7: Simulate webhook - mark Order as paid
    if (testMode === 'full') {
      const updatedOrder = await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          paymentStatus: 'paid',
          status: 'processing',
          stripeCheckoutSessionId: `test_session_${Date.now()}`,
        },
      });

      trace.steps.push({
        step: 'Order updated to paid (webhook simulation)',
        status: 'success',
        result: {
          orderId: updatedOrder.id,
          paymentStatus: updatedOrder.paymentStatus,
          status: updatedOrder.status,
        },
      });
    }

    // STEP 8: Final counts
    const ordersAfter = await prisma.order.count({ where: { storeId } });
    const sessionsAfter = await prisma.checkoutSession.count({ where: { storeId } });

    trace.steps.push({
      step: 'Final counts',
      status: 'success',
      result: {
        ordersCreated: ordersAfter - ordersBefore,
        sessionsCreated: sessionsAfter - sessionsBefore,
      },
    });

    // STEP 9: Verify Order integrity
    const finalOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: { items: true },
    });

    trace.steps.push({
      step: 'Order integrity check',
      status: finalOrder && finalOrder.items.length > 0 ? 'success' : 'failed',
      result: {
        orderId: finalOrder?.id,
        itemsCount: finalOrder?.items.length,
        total: finalOrder?.total,
        metadata: finalOrder?.metadata,
      },
    });

    trace.summary = {
      allPassed: trace.steps.every((s: any) => s.status === 'success' || s.status === 'not_found'),
      passCount: trace.steps.filter((s: any) => s.status === 'success').length,
      failCount: trace.steps.filter((s: any) => s.status === 'failed').length,
    };

    return NextResponse.json(trace);
  } catch (error) {
    trace.steps.push({
      step: 'Error',
      status: 'error',
      result: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    return NextResponse.json(trace, { status: 500 });
  }
}
