import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestWebhook } from '@/lib/webhook-engine';
import { invalidateOnStripeEvent } from '@/lib/redis-lock';
import { getCorrelationId } from '@/lib/observability';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, EmailType, upsertBrevoContact } from '@/lib/email/emailRouter';
import { systemLog } from '@/lib/logger';
import { appendAuditLog } from '@/lib/audit-log';
import { getStripeClient } from '@/lib/stripe';

// ── existing webhook handler ──────────────────────────────────────────────────

export const runtime = 'nodejs';
let stripe: Stripe | null = null;
async function getStripe(): Promise<Stripe> {
  if (!stripe) {
    stripe = await getStripeClient();
  }
  if (!stripe) {
    throw new Error('Stripe client failed to initialize');
  }
  return stripe;
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  stripe = await getStripe();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const correlationId = getCorrelationId(req);

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Resolve tenant from event metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = ((event.data.object as any)?.metadata) as
    | Record<string, string>
    | undefined;
  const organizationId = metadata?.organizationId;
  const tenantId = metadata?.storeId ?? organizationId;

  const result = await ingestWebhook(
    {
      source: 'stripe',
      eventType: event.type,
      eventId: event.id,
      rawBody: body,
      payload: event as unknown as Record<string, unknown>,
      organizationId,
      tenantId,
      correlationId,
    },
    async (payload) => {
      await processStripeEvent(payload.type as string, payload.data as Record<string, unknown>);
      // Cache invalidation after successful processing
      if (tenantId) {
        await invalidateOnStripeEvent(event.type, tenantId);
      }
    }
  );

  if (result.status === 'duplicate') {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (result.status === 'locked') {
    return NextResponse.json({ received: true, queued: true });
  }
  if (result.status === 'dead_lettered' || result.status === 'failed') {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true, correlationId: result.correlationId });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processStripeEvent(eventType: string, data: any) {
  const obj = data.object as Record<string, unknown>;

  switch (eventType) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(obj as unknown as Stripe.Checkout.Session);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(obj as unknown as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(obj as unknown as Stripe.PaymentIntent);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(obj as unknown as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(obj as unknown as Stripe.Invoice);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(obj as unknown as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(obj as unknown as Stripe.Subscription);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(obj as unknown as Stripe.Charge);
      break;
    case 'customer.updated':
      await handleCustomerUpdated(obj as unknown as Stripe.Customer);
      break;
    default:
      console.log(`[STRIPE WEBHOOK] Unhandled event type: ${eventType}`);
  }
}

// ── Checkout Completed ────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe = await getStripe();
  const metadata = session.metadata ?? {};
  const storeId = metadata.storeId;
  if (!storeId) return;

  // CRITICAL: Use CheckoutSession as source of truth to find pre-created Order
  const checkoutSession = await prisma.checkoutSession.findFirst({
    where: { stripeSessionId: session.id, storeId },
  });

  if (!checkoutSession?.orderId) {
    console.error('[STRIPE WEBHOOK] No CheckoutSession found for Stripe session', session.id);
    return;
  }

  // Fetch the pre-created order
  let order = await prisma.order.findUnique({
    where: { id: checkoutSession.orderId },
  });

  if (!order) {
    console.error('[STRIPE WEBHOOK] CheckoutSession linked to missing Order', checkoutSession.id);
    return;
  }

  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : undefined;
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
  const amountTotal = (session.amount_total ?? 0) / 100;
  const currency = session.currency?.toUpperCase() ?? 'USD';

  // Update order to paid
  order = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'paid',
      status: 'processing',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      stripeCustomerId,
    },
  });

  // ── Shippo Auto-Trigger for Physical Products ────────────────────────────
  try {
    // Fetch order items to get product IDs
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, store: true },
    });

    if (orderWithItems?.items && orderWithItems.items.length > 0) {
      // Get first product from order items
      const firstItemProductId = orderWithItems.items[0].productId;
      
      if (firstItemProductId) {
        const product = await prisma.product.findUnique({
          where: { id: firstItemProductId },
        });

        if (
          product?.metadata &&
          typeof product.metadata === 'object' &&
          'isPhysical' in product.metadata &&
          product.metadata.isPhysical === true &&
          orderWithItems.store?.fromAddressStreet
        ) {
          const { createShipment } = await import('@/lib/shippo');
          
          const shippoShipment = await createShipment({
            toAddress: {
              name: session.customer_details?.name ?? session.customer_email ?? '',
              street1: session.shipping_details?.address?.line1 ?? '',
              city: session.shipping_details?.address?.city ?? '',
              state: session.shipping_details?.address?.state ?? '',
              zip: session.shipping_details?.address?.postal_code ?? '',
              country: session.shipping_details?.address?.country ?? 'US',
            },
            fromAddress: {
              name: orderWithItems.store.fromAddressName ?? '',
              street1: orderWithItems.store.fromAddressStreet,
              city: orderWithItems.store.fromAddressCity ?? '',
              state: orderWithItems.store.fromAddressState ?? '',
              zip: orderWithItems.store.fromAddressZip ?? '',
              country: orderWithItems.store.fromAddressCountry ?? 'US',
              phone: orderWithItems.store.fromAddressPhone ?? undefined,
            },
            parcel: { length: 10, width: 8, height: 4, weight: 16 },
          });

          await prisma.order.update({
            where: { id: order.id },
            data: {
              metadata: {
                ...(order.metadata as object),
                shippoShipmentId: shippoShipment.object_id,
              },
            },
          });

          systemLog.info('[STRIPE WEBHOOK] Shippo shipment auto-created', {
            orderId: order.id,
            shipmentId: shippoShipment.object_id,
          });
        }
      }
    }
  } catch (shippoErr) {
    systemLog.error('[STRIPE WEBHOOK] Shippo auto-create failed', {
      error: { message: shippoErr instanceof Error ? shippoErr.message : String(shippoErr) },
      orderId: order.id,
    });
    // Don't throw - order creation must succeed even if Shippo fails
  }

  // ── Digital Content Delivery ─────────────────────────────────────────────
  try {
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    if (orderWithItems?.items && session.customer_email) {
      for (const item of orderWithItems.items) {
        if (!item.productId) continue;
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) continue;

        const meta = product.metadata as Record<string, unknown> | null;
        const contents = meta?.contents as Record<string, unknown> | undefined;
        if (!contents) continue;

        const productType = (meta?.type as string) ?? product.type;
        if (productType === 'physical') continue;

        const deliveryTrigger = (contents.deliveryTrigger as string) ?? 'immediately';
        if (deliveryTrigger !== 'immediately' && deliveryTrigger !== 'after_payment') continue;

        const files = (contents.files as Array<{ name: string; url: string }>) ?? [];
        const externalUrl = (contents.externalUrl as string) ?? '';
        const contentLinks = files.map(f => `${f.name}: ${f.url}`).join('\n');
        const deliveryContent = [contentLinks, externalUrl].filter(Boolean).join('\n');

        if (!deliveryContent) continue;

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'digital_product_delivery',
            email: session.customer_email,
            props: {
              productName: product.name,
              customerName: session.customer_details?.name ?? session.customer_email,
              deliveryContent,
              orderId: order.id,
              downloadLinks: files,
              externalUrl,
            },
          }),
        });

        systemLog.info('[STRIPE WEBHOOK] Digital content delivery triggered', {
          orderId: order.id,
          productId: product.id,
          email: session.customer_email,
        });
      }
    }
  } catch (deliveryErr) {
    systemLog.error('[STRIPE WEBHOOK] Digital content delivery failed', {
      error: { message: deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr) },
      orderId: order.id,
    });
    // Don't throw - order must succeed even if delivery email fails
  }

  // Create or update customer
  let customer = null;
  if (session.customer_email) {
    customer = await prisma.customer.upsert({
      where: { storeId_email: { storeId, email: session.customer_email } },
      create: {
        storeId,
        email: session.customer_email,
        name: session.customer_details?.name ?? undefined,
        stripeCustomerId,
        status: 'active',
      },
      update: {
        stripeCustomerId,
        name: session.customer_details?.name ?? undefined,
        totalOrders: { increment: 1 },
        totalSpent: { increment: amountTotal },
        lastOrderAt: new Date(),
        status: 'active',
      },
    });

    // Link customer to order if not already linked
    if (!order.customerId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { customerId: customer.id },
      });
    }
  }

  // ── Save Payment Method for Upsell ────────────────────────────────────────
  let stripePaymentMethodId: string | undefined;
  let hasSavedPaymentMethod = false;

  try {
    // Retrieve the SetupIntent to get the saved payment method
    if (session.setup_intent) {
      const setupIntentId =
        typeof session.setup_intent === 'string'
          ? session.setup_intent
          : session.setup_intent.id;
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      stripePaymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;
    }

    // Fallback: get payment method from PaymentIntent
    if (!stripePaymentMethodId && paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      stripePaymentMethodId =
        typeof pi.payment_method === 'string'
          ? pi.payment_method
          : pi.payment_method?.id;
    }

    // Save payment method to CustomerPaymentMethod
    if (stripePaymentMethodId && customer) {
      // Retrieve the PM details to determine card brand/last4
      const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

      await prisma.customerPaymentMethod.upsert({
        where: { stripePaymentMethodId },
        create: {
          customerId: customer.id,
          stripePaymentMethodId,
          type: pm.type ?? 'card',
          brand: pm.card?.brand ?? null,
          last4: pm.card?.last4 ?? null,
          expMonth: pm.card?.exp_month ?? null,
          expYear: pm.card?.exp_year ?? null,
          isDefault: true,
        },
        update: {
          isDefault: true,
          brand: pm.card?.brand ?? null,
          last4: pm.card?.last4 ?? null,
        },
      });
      hasSavedPaymentMethod = true;
    }
  } catch (err) {
    systemLog.error('[STRIPE WEBHOOK] Failed to save payment method', {
      error: { message: err instanceof Error ? err.message : String(err) },
    });
  }

  // ── Create Upsell Session ─────────────────────────────────────────────────
  if (stripeCustomerId && stripePaymentMethodId && hasSavedPaymentMethod) {
    try {
      const supabase = await createClient();
      await supabase.from('upsell_sessions').insert({
        checkout_session_id: checkoutSession.id,
        order_id: order.id,
        customer_id: customer?.id,
        stripe_customer_id: stripeCustomerId,
        stripe_payment_method_id: stripePaymentMethodId,
        status: 'active',
        current_step_order: 1,
        accepted_step_orders: [],
        declined_step_orders: [],
        total_upsell_revenue: 0,
      });
      systemLog.info('[STRIPE WEBHOOK] Upsell session created', {
        checkoutSessionId: checkoutSession.id,
        orderId: order.id,
      });
    } catch (err) {
      systemLog.error('[STRIPE WEBHOOK] Failed to create upsell session', {
        error: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  // ── Process Affiliate Commission ──────────────────────────────────────────
  const checkoutMeta = checkoutSession.metadata as Record<string, unknown> | null;
  const effectiveAffiliateCode =
    order.affiliateCode ??
    (typeof checkoutMeta?.affiliateCode === 'string' ? checkoutMeta.affiliateCode : undefined);

  if (effectiveAffiliateCode) {
    await processAffiliateCommission(storeId, order.id, effectiveAffiliateCode, amountTotal);
  }

  // ── Send Order Confirmation via EmailRouter (Resend) ──────────────────────
  if (session.customer_email) {
    try {
      await sendEmail({
        type: EmailType.ORDER_CONFIRMATION,
        data: {
          email: session.customer_email,
          name: session.customer_details?.name ?? undefined,
          orderNumber: order.orderNumber,
          orderTotal: amountTotal,
          currency,
        },
      });
    } catch (err) {
      systemLog.error('[STRIPE WEBHOOK] Order confirmation email failed', {
        error: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  // ── Sync to Brevo (if customer accepted marketing) ───────────────────────
  if (customer?.acceptsMarketing && session.customer_email) {
    try {
      await upsertBrevoContact({
        email: session.customer_email,
        attributes: {
          FIRSTNAME: session.customer_details?.name?.split(' ')[0] ?? '',
          LASTNAME: session.customer_details?.name?.split(' ').slice(1).join(' ') ?? '',
          ORDER_NUMBER: order.orderNumber,
          ORDER_TOTAL: amountTotal,
        },
        updateEnabled: true,
      });
      systemLog.info('[STRIPE WEBHOOK] Brevo contact synced', {
        email: session.customer_email,
      });

      // ── Enroll in Post-Purchase Automation Sequence ─────────────────────
      try {
        const supabase = await createClient();
        const { data: sequenceSettings } = await supabase
          .from('integration_settings')
          .select('*')
          .eq('store_id', storeId)
          .eq('provider', 'brevo_sequences')
          .single();

        if (sequenceSettings?.credentials) {
          const credentials =
            typeof sequenceSettings.credentials === 'object' && sequenceSettings.credentials !== null
              ? sequenceSettings.credentials
              : {};
          const sequenceId = 'post_purchase_sequence_id' in credentials ? credentials.post_purchase_sequence_id : null;

          if (sequenceId && process.env.BREVO_API_KEY) {
            await fetch('https://api.brevo.com/v3/automations/push', {
              method: 'POST',
              headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: session.customer_email,
                automationId: parseInt(String(sequenceId)),
              }),
            });

            systemLog.info('[STRIPE WEBHOOK] Enrolled in Brevo post-purchase automation', {
              email: session.customer_email,
              automationId: sequenceId,
            });
          }
        }
      } catch (automationErr) {
        systemLog.error('[STRIPE WEBHOOK] Brevo automation enrollment failed', {
          error: {
            message: automationErr instanceof Error ? automationErr.message : String(automationErr),
          },
        });
        // Silent failure - don't block order processing
      }
    } catch (err) {
      systemLog.error('[STRIPE WEBHOOK] Brevo contact sync failed', {
        error: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }
}

// ── Payment Intent Handlers ───────────────────────────────────────────────────

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: pi.id } });
  if (!order) return;

  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'paid' } });

  await prisma.transaction.upsert({
    where: { stripeTransactionId: pi.id },
    create: {
      orderId: order.id,
      type: 'charge',
      status: 'succeeded',
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      stripeTransactionId: pi.id,
      stripePaymentIntentId: pi.id,
    },
    update: { status: 'succeeded' },
  });
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: pi.id } });
  if (!order) return;

  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'failed' } });

  await prisma.transaction.upsert({
    where: { stripeTransactionId: pi.id },
    create: {
      orderId: order.id,
      type: 'charge',
      status: 'failed',
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      stripeTransactionId: pi.id,
      failureCode: pi.last_payment_error?.code ?? undefined,
      failureMessage: pi.last_payment_error?.message ?? undefined,
    },
    update: {
      status: 'failed',
      failureCode: pi.last_payment_error?.code ?? undefined,
      failureMessage: pi.last_payment_error?.message ?? undefined,
    },
  });

  // Send failed payment notification via EmailRouter
  try {
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { customer: true },
    });
    if (fullOrder?.customer?.email) {
      await sendEmail({
        type: EmailType.REFUND_CONFIRMATION,
        data: {
          email: fullOrder.customer.email,
          name: fullOrder.customer.name ?? undefined,
          refundAmount: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
        },
      });
    }
  } catch (err) {
    systemLog.error('[STRIPE WEBHOOK] Failed payment email error', {
      error: { message: err instanceof Error ? err.message : String(err) },
    });
  }
}

// ── Invoice Handlers ─────────────────────────────────────────────────────────

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
  if (!stripeSubId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubId },
  });
  if (!subscription) return;

  await prisma.subscriptionInvoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      status: 'paid',
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      periodStart: new Date((invoice.period_start ?? 0) * 1000),
      periodEnd: new Date((invoice.period_end ?? 0) * 1000),
      paidAt: new Date(),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
      invoicePdf: invoice.invoice_pdf ?? undefined,
    },
    update: { status: 'paid', paidAt: new Date() },
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'active', failedPaymentCount: 0, lastPaymentAt: new Date() },
  });

  // Send subscription renewal receipt
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: subscription.customerId },
    });
    if (customer?.email) {
      await sendEmail({
        type: EmailType.SUBSCRIPTION_RENEWAL,
        data: {
          email: customer.email,
          name: customer.name ?? undefined,
          planName: subscription.planName,
          amount: Number(subscription.amount),
          nextBillingDate: subscription.currentPeriodEnd.toLocaleDateString(),
        },
      });
    }
  } catch (err) {
    systemLog.error('[STRIPE WEBHOOK] Subscription renewal email failed', {
      error: { message: err instanceof Error ? err.message : String(err) },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
  if (!stripeSubId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubId },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'past_due', failedPaymentCount: { increment: 1 } },
  });
}

// ── Subscription Handlers ─────────────────────────────────────────────────────

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
  const metadata = stripeSub.metadata ?? {};
  const storeId = metadata.storeId;

  const statusMap: Record<string, string> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    paused: 'paused',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    unpaid: 'past_due',
  };

  const data = {
    status: statusMap[stripeSub.status] ?? stripeSub.status,
    currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : undefined,
    trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : undefined,
    trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : undefined,
    stripeCustomerId: typeof stripeSub.customer === 'string' ? stripeSub.customer : undefined,
    stripePriceId: stripeSub.items.data[0]?.price?.id,
    stripeProductId:
      typeof stripeSub.items.data[0]?.price?.product === 'string'
        ? stripeSub.items.data[0].price.product
        : undefined,
  };

  let customer = await prisma.customer.findFirst({
    where: {
      stripeCustomerId: typeof stripeSub.customer === 'string' ? stripeSub.customer : undefined,
    },
  });
  if (!customer) return;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: stripeSub.id },
    create: {
      customerId: customer.id,
      storeId,
      stripeSubscriptionId: stripeSub.id,
      planName: stripeSub.items.data[0]?.price?.nickname ?? 'Subscription',
      amount: (stripeSub.items.data[0]?.price?.unit_amount ?? 0) / 100,
      currency: stripeSub.currency.toUpperCase(),
      interval: stripeSub.items.data[0]?.price?.recurring?.interval ?? 'month',
      intervalCount: stripeSub.items.data[0]?.price?.recurring?.interval_count ?? 1,
      ...data,
    },
    update: data,
  });
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: stripeSub.id },
    data: { status: 'canceled', canceledAt: new Date() },
  });
}

// ── Charge Refunded ──────────────────────────────────────────────────────────

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined;

  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { customer: true },
  });
  if (!order) return;

  const refundedAmount = charge.amount_refunded / 100;
  const isFullRefund = charge.amount_refunded === charge.amount;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: isFullRefund ? 'refunded' : 'partially_refunded',
      refundedAmount,
    },
  });

  for (const refund of charge.refunds?.data ?? []) {
    await prisma.refund.upsert({
      where: { stripeRefundId: refund.id },
      create: {
        orderId: order.id,
        amount: refund.amount / 100,
        reason: refund.reason ?? undefined,
        status: 'processed',
        stripeRefundId: refund.id,
        processedAt: new Date(refund.created * 1000),
      },
      update: { status: 'processed' },
    });
  }

  // Send refund confirmation via EmailRouter
  if (order.customer?.email) {
    try {
      await sendEmail({
        type: EmailType.REFUND_CONFIRMATION,
        data: {
          email: order.customer.email,
          name: order.customer.name ?? undefined,
          refundAmount: refundedAmount,
          currency: order.currency ?? 'USD',
        },
      });
    } catch (err) {
      systemLog.error('[STRIPE WEBHOOK] Refund confirmation email error', {
        error: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }
}

// ── Customer Updated ─────────────────────────────────────────────────────────

async function handleCustomerUpdated(stripeCustomer: Stripe.Customer) {
  if (!stripeCustomer.email) return;
  await prisma.customer.updateMany({
    where: { stripeCustomerId: stripeCustomer.id },
    data: { name: stripeCustomer.name ?? undefined, phone: stripeCustomer.phone ?? undefined },
  });
}

// ── Affiliate Commission ──────────────────────────────────────────────────────

async function processAffiliateCommission(
  storeId: string,
  orderId: string,
  affiliateCode: string,
  orderTotal: number
) {
  const affiliate = await prisma.affiliate.findFirst({
    where: { storeId, referralCode: affiliateCode, status: 'active' },
  });
  if (!affiliate) return;

  const commissionAmount = orderTotal * Number(affiliate.commissionRate);

  const commission = await prisma.affiliateCommission.create({
    data: {
      affiliateId: affiliate.id,
      orderId,
      type: 'one_time',
      amount: commissionAmount,
      rate: affiliate.commissionRate,
      orderTotal,
      status: 'pending',
    },
  });

  // Audit log for commission creation
  appendAuditLog({
    actorId: 'system',
    tenantId: storeId,
    action: 'affiliate.commission.approved',
    resourceType: 'affiliate_commission',
    resourceId: commission.id,
    metadata: {
      affiliateId: affiliate.id,
      orderId,
      amount: commissionAmount,
      rate: affiliate.commissionRate,
      status: 'pending',
    },
  });

  await prisma.affiliate.update({
    where: { id: affiliate.id },
    data: {
      totalEarned: { increment: commissionAmount },
      pendingBalance: { increment: commissionAmount },
      totalConversions: { increment: 1 },
    },
  });

  // Send affiliate commission earned email
  try {
    await sendEmail({
      type: EmailType.AFFILIATE_COMMISSION_EARNED,
      data: {
        email: affiliate.email,
        name: affiliate.name,
        amount: commissionAmount,
        orderNumber: (await prisma.order.findUnique({ where: { id: orderId } }))?.orderNumber ?? '',
      },
    });
  } catch (err) {
    systemLog.error('[STRIPE WEBHOOK] Affiliate commission email failed', {
      error: { message: err instanceof Error ? err.message : String(err) },
    });
  }
}