import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';

async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const { id } = await params;
  try {
    const product = await stripe.products.retrieve(id, { expand: ['default_price'] });
    const prices = await stripe.prices.list({ product: id, limit: 20 });

    return NextResponse.json({
      ...product,
      prices: prices.data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { name, description, active, metadata, price, currency = 'usd', priceId, recurring, interval } = body;

    const productUpdate: Stripe.ProductUpdateParams = {};
    if (name !== undefined) productUpdate.name = name;
    if (description !== undefined) productUpdate.description = description || '';
    if (active !== undefined) productUpdate.active = active;
    if (metadata !== undefined) productUpdate.metadata = metadata;
    if (body.images !== undefined && Array.isArray(body.images)) {
      productUpdate.images = body.images.filter((u: unknown) => typeof u === 'string' && u.length > 0);
    }

    const updatedProduct = await stripe.products.update(id, productUpdate);

    let updatedPrice: Stripe.Price | null = null;
    if (price !== undefined && price !== null) {
      const amountInCents = Math.round(price * 100);

      if (priceId) {
        await stripe.prices.update(priceId, { active: false });
      }

      updatedPrice = await stripe.prices.create({
        product: id,
        unit_amount: amountInCents,
        currency,
        recurring: recurring ? { interval: interval ?? 'month' } : undefined,
      });

      await stripe.products.update(id, { default_price: updatedPrice.id });
    }

    return NextResponse.json({ product: updatedProduct, price: updatedPrice });
  } catch (error: unknown) {
    console.error('[STRIPE PRODUCTS] Update error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const { id } = await params;
  try {
    const body = await req.json();
    const { name, description, active, metadata, price, currency = 'usd', priceId, recurring, interval, images } = body;

    const productUpdate: Stripe.ProductUpdateParams = {};
    if (name !== undefined) productUpdate.name = name;
    if (description !== undefined) productUpdate.description = description || '';
    if (active !== undefined) productUpdate.active = active;
    if (metadata !== undefined) productUpdate.metadata = metadata;

    // Handle image updates — accept pre-uploaded URLs from Supabase Storage
    if (images !== undefined && Array.isArray(images)) {
      productUpdate.images = images.filter((u: unknown) => typeof u === 'string' && u.length > 0);
    }

    const updatedProduct = await stripe.products.update(id, productUpdate);

    let updatedPrice: Stripe.Price | null = null;
    if (price !== undefined && price !== null) {
      const amountInCents = Math.round(price * 100);

      if (priceId) {
        await stripe.prices.update(priceId, { active: false });
      }

      updatedPrice = await stripe.prices.create({
        product: id,
        unit_amount: amountInCents,
        currency,
        recurring: recurring ? { interval: interval ?? 'month' } : undefined,
      });

      await stripe.products.update(id, { default_price: updatedPrice.id });
    }

    return NextResponse.json({ product: updatedProduct, price: updatedPrice });
  } catch (error: unknown) {
    console.error('[STRIPE PRODUCTS] Update error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const { id } = await params;
  const permanent = req.nextUrl.searchParams.get('permanent') === 'true';

  try {
    if (permanent) {
      // First archive all active prices (Stripe requires no active prices to delete product)
      const prices = await stripe.prices.list({ product: id, limit: 100, active: true });
      for (const price of prices.data) {
        await stripe.prices.update(price.id, { active: false });
      }
      // Permanently delete the product from Stripe
      const deletedProduct = await stripe.products.del(id);
      return NextResponse.json({ product: deletedProduct, deleted: true, permanent: true });
    } else {
      // Archive: set active to false
      const product = await stripe.products.update(id, { active: false });
      return NextResponse.json({ product, archived: true });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
