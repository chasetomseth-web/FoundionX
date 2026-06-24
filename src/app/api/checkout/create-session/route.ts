import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { resolveStoreId } from '@/lib/merchant-pages/blockHelpers';
import { getStripeClient } from '@/lib/stripe';

let stripe: Stripe | null = null;
async function getStripe() {
  if (!stripe) {
    stripe = await getStripeClient();
  }
  return stripe;
}

const DEFAULT_IDEMPOTENCY_WINDOW_MINUTES = 15;

function parseAmount(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const num = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(num) ? num : null;
}

function buildIdempotencyKey(
  payload: Record<string, unknown>,
  windowMinutes = DEFAULT_IDEMPOTENCY_WINDOW_MINUTES
): string {
  const bucket = Math.floor(Date.now() / (1000 * 60 * Math.max(1, windowMinutes)));
  const keyString = [
    payload.storeId ?? '',
    payload.pageId ?? '',
    payload.offerId ?? payload.productId ?? '',
    payload.couponCode ?? '',
    payload.affiliateCode ?? '',
    payload.customerEmail ?? '',
    payload.mode ?? 'payment',
    `bucket:${bucket}`,
  ].join('|');

  return createHash('sha256').update(keyString).digest('hex');
}

async function resolveCouponId(storeId: string, couponCode: string): Promise<string> {
  const normalizedCode = couponCode.trim().toUpperCase();

  const localCoupon = await prisma.coupon.findFirst({
    where: {
      storeId,
      code: normalizedCode,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (localCoupon?.stripeCouponId) {
    const stripeCoupon = await stripe.coupons
      .retrieve(localCoupon.stripeCouponId)
      .catch(() => null);
    if (stripeCoupon?.valid) {
      return stripeCoupon.id;
    }
  }

  try {
    const supabase = await createClient();
    const { data: dbCoupon } = await supabase
      .from('coupons')
      .select('stripe_coupon_id, status, expires_at')
      .eq('code', normalizedCode)
      .eq('status', 'active')
      .maybeSingle();

    const stripeCouponId = dbCoupon?.stripe_coupon_id as string | undefined;
    if (stripeCouponId) {
      const stripeCoupon = await stripe.coupons.retrieve(stripeCouponId).catch(() => null);
      if (stripeCoupon?.valid) {
        return stripeCoupon.id;
      }
    }
  } catch {
    // Continue to Stripe lookup if Supabase is unavailable
  }

  const coupon = await stripe.coupons.retrieve(normalizedCode).catch(() => null);
  if (coupon?.valid) {
    return coupon.id;
  }

  const promotionCodes = await stripe.promotionCodes.list({
    code: normalizedCode,
    active: true,
    limit: 1,
  });
  const promo = promotionCodes.data[0];
  if (promo?.coupon && typeof promo.coupon !== 'string') {
    const promoCoupon = await stripe.coupons.retrieve(promo.coupon.id).catch(() => null);
    if (promoCoupon?.valid) {
      return promoCoupon.id;
    }
  }

  throw new Error('Invalid or expired coupon code');
}

async function resolveAffiliateId(code: string, storeId: string): Promise<string | null> {
  if (!code?.trim()) return null;
  const affiliate = await prisma.affiliate.findFirst({
    where: { storeId, referralCode: code.trim(), status: 'active' },
  });
  return affiliate?.id ?? null;
}

async function resolveCouponAffiliateId(storeId: string, couponCode: string): Promise<string | null> {
  const normalizedCode = couponCode.trim().toUpperCase();
  const coupon = await prisma.coupon.findFirst({
    where: {
      storeId,
      code: normalizedCode,
      active: true,
      affiliateId: { not: null },
    },
    select: { affiliateId: true },
  });
  return coupon?.affiliateId ?? null;
}

async function resolveLineItems(items: any[], mode: string, storeId: string) {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderItems: Array<{
    productId?: string;
    variantId?: string;
    name: string;
    sku?: string;
    quantity: number;
    price: number;
    total: number;
    metadata: Record<string, unknown>;
  }> = [];

  let currency = 'USD';
  let subtotal = 0;

  for (const item of items) {
    const quantity = Math.max(1, Number(item.quantity ?? 1));
    const productId = item.productId?.toString().trim();
    const offerId = item.offerId?.toString().trim();
    const priceValue = parseAmount(item.price);
    const images = Array.isArray(item.images) ? item.images.filter(Boolean).map(String) : undefined;
    const name = String(item.name ?? item.title ?? item.productName ?? 'Order item');
    const description = String(item.description ?? '');

    let priceData: Stripe.Checkout.SessionCreateParams.LineItem['price_data'] | undefined;
    let priceId: string | undefined;
    let unitAmount = 0;
    let itemProductId: string | undefined = undefined;
    let sku: string | undefined;
    let orderItemName = name;
    let orderItemMetadata: Record<string, unknown> = {
      offerId,
      productId,
      priceId: item.priceId,
      description,
      images,
    };

    if (offerId) {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { prices: { orderBy: { createdAt: 'asc' } }, product: true },
      });
      if (!offer) {
        throw new Error('Offer not found');
      }
      if (offer.storeId !== storeId) {
        throw new Error('Offer does not belong to the requested store');
      }

      currency = offer.currency ?? currency;
      orderItemName = offer.name;
      itemProductId = offer.productId;
      sku = offer.product?.sku ?? undefined;

      const selectedPrice = item.priceId
        ? offer.prices.find((price) => price.id === item.priceId)
        : offer.prices[0];

      if (!selectedPrice) {
        throw new Error('Offer price not found');
      }

      if (selectedPrice.stripePriceId) {
        priceId = selectedPrice.stripePriceId;
      } else if (selectedPrice.amount != null) {
        priceData = {
          currency,
          product_data: { name: orderItemName, description },
          unit_amount: Math.round(Number(selectedPrice.amount) * 100),
        };
      } else if (offer.stripePriceId) {
        priceId = offer.stripePriceId;
      }

      unitAmount = priceId ? 0 : Number(selectedPrice.amount ?? 0);
      if (priceId && selectedPrice.amount != null) {
        unitAmount = Number(selectedPrice.amount);
      }
    } else if (productId) {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error('Product not found');
      }
      if (product.storeId !== storeId) {
        throw new Error('Product does not belong to the requested store');
      }

      // Product model doesn't have currency — use store's default
      // currency = product.currency ?? currency;
      // Keep existing currency
      orderItemName = product.name;
      itemProductId = product.id;
      sku = product.sku ?? undefined;

      if (product.stripePriceId) {
        priceId = product.stripePriceId;
      } else if (priceValue != null) {
        priceData = {
          currency,
          product_data: { name: orderItemName, description },
          unit_amount: Math.round(priceValue * 100),
          recurring: mode === 'subscription' ? { interval: 'month', interval_count: 1 } : undefined,
        };
        unitAmount = priceValue;
      } else {
        priceData = {
          currency,
          product_data: { name: orderItemName, description },
          unit_amount: Math.round(Number(product.price ?? 0) * 100),
          recurring: mode === 'subscription' ? { interval: 'month', interval_count: 1 } : undefined,
        };
        unitAmount = Number(product.price ?? 0);
      }
    } else if (priceValue != null) {
      priceData = {
        currency,
        product_data: { name: orderItemName, description },
        unit_amount: Math.round(priceValue * 100),
        recurring: mode === 'subscription' ? { interval: 'month', interval_count: 1 } : undefined,
      };
      unitAmount = priceValue;
    }

    if (!priceData && !priceId) {
      throw new Error('Each item must include a product, offer, or valid price.');
    }

    const finalLineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity,
      ...(priceId ? { price: priceId } : { price_data: priceData }),
    };

    if (!priceId && priceData?.product_data) {
      finalLineItem.price_data = {
        ...priceData,
        product_data: {
          ...priceData.product_data,
          description,
          images,
        },
      };
    }

    lineItems.push(finalLineItem);

    const unitPrice = Number(unitAmount) || Number((priceData?.unit_amount ?? 0) / 100);
    const itemTotal = unitPrice * quantity;
    subtotal += itemTotal;

    orderItems.push({
      productId: itemProductId,
      name: orderItemName,
      sku,
      quantity,
      price: Number(unitPrice.toFixed(2)),
      total: Number(itemTotal.toFixed(2)),
      metadata: orderItemMetadata,
    });
  }

  return { lineItems, orderItems, currency, subtotal };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const storeId = await resolveStoreId(body.storeId?.toString());
  const mode = String(body.mode ?? 'payment');
  const couponCode =
    typeof body.couponCode === 'string'
      ? body.couponCode.trim()
      : typeof body.coupon === 'string'
        ? body.coupon.trim()
        : undefined;
  // Read affiliate code: body param takes priority, then fall back to tracking cookie
  const cookieRaw = request.cookies.get('mos_affiliate')?.value;
  let cookieAffiliate: { affiliateId?: string; referralCode?: string; storeId?: string } = {};
  try {
    if (cookieRaw) cookieAffiliate = JSON.parse(cookieRaw);
  } catch {
    // ignore malformed cookie
  }

  const affiliateCode =
    (typeof body.affiliateCode === 'string' ? body.affiliateCode.trim() : undefined) ??
    (typeof body.affiliate === 'string' ? body.affiliate.trim() : undefined) ??
    (cookieAffiliate.storeId === storeId ? cookieAffiliate.referralCode : undefined);

  const pageId = typeof body.pageId === 'string' ? body.pageId.trim() : undefined;
  const customerEmail =
    typeof body.customerEmail === 'string' ? body.customerEmail.trim() : undefined;
  const successUrl = String(
    body.successUrl ??
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://merchantos.com'}/checkout/success`
  );
  const checkoutTemplate = typeof body.template === 'string' ? body.template : undefined;
  const checkoutUrl = body.checkoutUrl
    ? String(body.checkoutUrl)
    : `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://merchantos.com'}/checkout${checkoutTemplate ? `?template=${checkoutTemplate}` : ''}`;
  const cancelUrl = String(
    body.cancelUrl ??
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://merchantos.com'}/checkout/cancel`
  );
  const idempotencyWindowMinutes = Number(
    body.idempotencyWindowMinutes ?? DEFAULT_IDEMPOTENCY_WINDOW_MINUTES
  );
  const externalIdempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : (request.headers.get('x-idempotency-key') ?? undefined);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'No line items provided' }, { status: 400 });
  }

  const itemFingerprint = (body.items as any[])
    .map((item) => `${item.offerId ?? item.productId ?? item.price ?? item.name ?? ''}`)
    .join('|');

  const idempotencyKey =
    externalIdempotencyKey ||
    buildIdempotencyKey(
      {
        storeId,
        pageId,
        itemFingerprint,
        couponCode,
        affiliateCode,
        customerEmail,
        mode,
      },
      idempotencyWindowMinutes
    );

  const existingSession = await prisma.checkoutSession.findFirst({
    where: { idempotencyKey, storeId },
  });
  if (existingSession) {
    if (existingSession.stripeSessionId && existingSession.stripeSessionUrl) {
      return NextResponse.json({
        sessionId: existingSession.stripeSessionId,
        url: existingSession.stripeSessionUrl,
        orderId: existingSession.orderId,
      });
    }
  }

  let stripeCouponId: string | undefined;
  let couponValidated: any = null;
  if (couponCode) {
    try {
      stripeCouponId = await resolveCouponId(storeId, couponCode);
      
      // D.1 — Enhanced Coupon Rules: Get full coupon details for validation
      couponValidated = await prisma.coupon.findFirst({
        where: {
          storeId,
          code: couponCode.trim().toUpperCase(),
          active: true,
        },
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Invalid coupon code';
      return NextResponse.json(
        { error: errMsg },
        { status: 400 }
      );
    }
  }

  let affiliateId: string | null = null;
  if (affiliateCode) {
    affiliateId = await resolveAffiliateId(affiliateCode, storeId);
    if (!affiliateId) {
      return NextResponse.json({ error: 'Invalid affiliate code' }, { status: 400 });
    }
  } else if (couponCode) {
    // If no affiliate cookie, check if the coupon is assigned to an affiliate
    affiliateId = await resolveCouponAffiliateId(storeId, couponCode);
  }

  let checkoutSession = await prisma.checkoutSession.upsert({
    where: { idempotencyKey },
    update: {
      storeId,
      mode,
      metadata: {
        pageId,
        affiliateCode,
        couponCode,
        customerEmail,
        cookieRaw: cookieRaw ?? undefined,
      },
      updatedAt: new Date(),
    },
    create: {
      storeId,
      idempotencyKey,
      mode,
      status: 'pending',
      metadata: {
        pageId,
        affiliateCode,
        couponCode,
        customerEmail,
        cookieRaw: cookieRaw ?? undefined,
      },
    },
  });

  // IDEMPOTENCY CHECK: If CheckoutSession already has an Order, reuse it
  if (checkoutSession.orderId) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: checkoutSession.orderId },
    });
    if (existingOrder && existingOrder.stripeCheckoutSessionId) {
      return NextResponse.json({
        sessionId: checkoutSession.stripeSessionId,
        url: checkoutSession.stripeSessionUrl,
        orderId: existingOrder.id,
        checkoutSessionId: checkoutSession.id,
      });
    }
  }

  const { lineItems, orderItems, currency, subtotal } = await resolveLineItems(
    body.items as any[],
    mode,
    storeId
  );

  // Create new Order (only if CheckoutSession doesn't already have one)
  let order = await prisma.order.create({
    data: {
      storeId,
      customerId: undefined,
      orderNumber: `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      currency: currency.toUpperCase(),
      subtotal: subtotal,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      total: subtotal,
      couponCode: couponCode ?? undefined,
      affiliateId: affiliateId ?? undefined,
      affiliateCode: affiliateCode ?? undefined,
      isSubscriptionOrder: mode === 'subscription',
      metadata: {
        pageId,
        couponCode,
        affiliateCode,
        customerEmail,
        idempotencyKey,
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      items: {
        create: orderItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          metadata: item.metadata as any,
        })),
      },
    },
  });

  checkoutSession = await prisma.checkoutSession.update({
    where: { id: checkoutSession.id },
    data: { orderId: order.id },
  });

  // B.4 — Tax Calculation: Read store's taxEnabled field
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { taxEnabled: true, taxBehavior: true },
  });

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: mode === 'subscription' ? 'subscription' : 'payment',
    payment_method_types: ['card'],
    client_reference_id: order.id,
    line_items: lineItems,
    customer_email: customerEmail,
    discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
    metadata: {
      storeId,
      pageId: pageId ?? '',
      couponCode: couponCode ?? '',
      affiliateCode: affiliateCode ?? '',
      orderId: order.id,
      idempotencyKey,
    },
    success_url: successUrl,
    cancel_url: cancelUrl.includes('?')
      ? cancelUrl
      : (checkoutTemplate ? `${cancelUrl}?template=${checkoutTemplate}` : cancelUrl),
    allow_promotion_codes: true,
    automatic_tax: store?.taxEnabled ? { enabled: true } : undefined,
    tax_id_collection: store?.taxEnabled ? { enabled: true } : undefined,
    billing_address_collection: 'auto',
    // Collect payment method for later off-session upsell charges
    payment_method_collection: 'always',
    setup_intent_data: {
      metadata: {
        storeId,
        orderId: order.id,
      },
    },
  };

  if (body.collectShipping === true || body.collectShipping === 'true') {
    sessionParams.shipping_address_collection = { allowed_countries: ['US', 'CA'] };
  }

  const stripeSession = await stripe.checkout.sessions.create(sessionParams, {
    idempotencyKey,
  });

  if (!stripeSession.url) {
    throw new Error('Stripe Checkout Session created but no checkout URL returned');
  }

  const updatedSession = await prisma.checkoutSession.update({
    where: { id: checkoutSession.id },
    data: {
      stripeSessionId: stripeSession.id,
      stripeSessionUrl: stripeSession.url ?? undefined,
      status: 'created',
      metadata: {
        ...(checkoutSession.metadata as Record<string, unknown> ?? {}),
        stripeSessionId: stripeSession.id,
      } as any,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      stripeCheckoutSessionId: stripeSession.id,
      metadata: {
        ...(order.metadata as Record<string, unknown> ?? {}),
        stripeSessionId: stripeSession.id,
      } as any,
    },
  });

  return NextResponse.json({
    sessionId: stripeSession.id,
    url: stripeSession.url,
    orderId: order.id,
    checkoutSessionId: updatedSession.id,
  });
}
