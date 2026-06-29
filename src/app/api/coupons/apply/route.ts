import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { isValidRequest } from '@/lib/guard';

async function getStripe(): Promise<Stripe | null> {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

function guard(req: NextRequest) {
  if (!isValidRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/**
 * POST /api/coupons/apply
 * Validates a coupon code and returns the discount details.
 * Also resolves the Stripe coupon ID so checkout can apply it directly.
 */
export async function POST(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  try {
    const { code, orderTotal } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const upperCode = (code as string).toUpperCase().trim();

    // Look up coupon in our DB first
    const supabase = await createClient();
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', upperCode)
      .maybeSingle();

    if (error) throw error;

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Coupon code not found' }, { status: 404 });
    }

    // Check status
    if (coupon.status !== 'active') {
      return NextResponse.json({ valid: false, error: 'This coupon is no longer active' }, { status: 400 });
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'This coupon has expired' }, { status: 400 });
    }

    // Check usage limit
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit' }, { status: 400 });
    }

    // Check minimum order
    if (coupon.minimum_order !== null && orderTotal !== undefined && Number(orderTotal) < Number(coupon.minimum_order)) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order of $${coupon.minimum_order} required for this coupon`,
      }, { status: 400 });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = orderTotal ? (Number(orderTotal) * Number(coupon.value)) / 100 : 0;
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(Number(coupon.value), orderTotal ?? Number(coupon.value));
    } else if (coupon.type === 'free_shipping') {
      discountAmount = 0; // handled at checkout level
    }

    // Ensure Stripe coupon exists (create if missing)
    let stripeCouponId = coupon.stripe_coupon_id as string | null;
    const stripe = await getStripe();
    if (stripe && !stripeCouponId && coupon.type !== 'free_shipping') {
      try {
        const existing = await stripe.coupons.retrieve(upperCode).catch(() => null);
        if (existing && existing.valid) {
          stripeCouponId = existing.id;
        } else {
          const created = await stripe.coupons.create({
            id: upperCode,
            name: upperCode,
            ...(coupon.type === 'percentage'
              ? { percent_off: Number(coupon.value) }
              : { amount_off: Math.round(Number(coupon.value) * 100), currency: 'usd' }),
            ...(coupon.usage_limit ? { max_redemptions: Number(coupon.usage_limit) } : {}),
            ...(coupon.expires_at ? { redeem_by: Math.floor(new Date(coupon.expires_at).getTime() / 1000) } : {}),
          });
          stripeCouponId = created.id;
        }
        // Persist stripe_coupon_id
        await supabase.from('coupons').update({ stripe_coupon_id: stripeCouponId }).eq('id', coupon.id);
      } catch (stripeErr) {
        console.warn('[COUPONS/APPLY] Stripe sync warning:', stripeErr);
      }
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount: Math.round(discountAmount * 100) / 100,
        stripeCouponId,
        minimumOrder: coupon.minimum_order,
        expiresAt: coupon.expires_at,
      },
    });
  } catch (err) {
    console.error('[COUPONS/APPLY] Error:', err);
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
