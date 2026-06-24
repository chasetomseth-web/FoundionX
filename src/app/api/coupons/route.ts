import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe';

async function getStripe(): Promise<Stripe | null> {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

// ── GET /api/coupons ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ coupons: data ?? [] });
  } catch (err) {
    console.error('[COUPONS] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

// ── POST /api/coupons ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, type, value, usageLimit, minimumOrder, expiresAt } = body;

    if (!code || !type) {
      return NextResponse.json({ error: 'Code and type are required' }, { status: 400 });
    }

    const upperCode = (code as string).toUpperCase().trim();

    // Create coupon in Stripe (skip for free_shipping — Stripe doesn't have a native free-shipping coupon type)
    let stripeCouponId: string | null = null;
    const stripe = await getStripe();
    if (stripe && type !== 'free_shipping') {
      try {
        const stripeParams: Stripe.CouponCreateParams = {
          id: upperCode,
          name: upperCode,
          ...(type === 'percentage'
            ? { percent_off: Number(value) }
            : { amount_off: Math.round(Number(value) * 100), currency: 'usd' }),
          ...(usageLimit ? { max_redemptions: Number(usageLimit) } : {}),
          ...(expiresAt ? { redeem_by: Math.floor(new Date(expiresAt).getTime() / 1000) } : {}),
        };
        const stripeCoupon = await stripe.coupons.create(stripeParams);
        stripeCouponId = stripeCoupon.id;
      } catch (stripeErr: unknown) {
        // If coupon already exists in Stripe, retrieve it
        if ((stripeErr as { code?: string })?.code === 'resource_already_exists') {
          try {
            const existing = await stripe.coupons.retrieve(upperCode);
            stripeCouponId = existing.id;
          } catch {
            // ignore
          }
        } else {
          console.warn('[COUPONS] Stripe coupon creation warning:', stripeErr);
        }
      }
    }

    // Save to Supabase
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: upperCode,
        type,
        value: Number(value) || 0,
        usage_limit: usageLimit ? Number(usageLimit) : null,
        minimum_order: minimumOrder ? Number(minimumOrder) : null,
        expires_at: expiresAt || null,
        status: 'active',
        stripe_coupon_id: stripeCouponId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (err: unknown) {
    console.error('[COUPONS] POST error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to create coupon';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PATCH /api/coupons ────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('coupons')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Sync status to Stripe
    if (status === 'disabled' && data?.stripe_coupon_id) {
      const stripe = await getStripe();
      if (stripe) {
        try {
          await stripe.coupons.del(data.stripe_coupon_id);
        } catch {
          // ignore if already deleted
        }
      }
    }

    return NextResponse.json({ coupon: data });
  } catch (err) {
    console.error('[COUPONS] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

// ── DELETE /api/coupons ───────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

    const supabase = await createClient();

    // Get stripe_coupon_id before deleting
    const { data: existing } = await supabase
      .from('coupons')
      .select('stripe_coupon_id')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;

    // Delete from Stripe too
    if (existing?.stripe_coupon_id) {
      const stripe = await getStripe();
      if (stripe) {
        try {
          await stripe.coupons.del(existing.stripe_coupon_id);
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[COUPONS] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
