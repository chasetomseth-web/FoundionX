import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';
async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json(
      {
        error: 'Stripe is not configured. Add your STRIPE_SECRET_KEY in Settings → Integrations to sync products from your Stripe dashboard.',
      },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search') ?? '';
    const activeOnly = searchParams.get('active') === 'true';

    // Fetch all products from Stripe
    const productsResponse = await stripe.products.list({
      limit: 100,
      active: activeOnly ? true : undefined,
      expand: ['data.default_price'],
    });

    // Fetch all prices to attach to products
    const pricesResponse = await stripe.prices.list({
      limit: 100,
      expand: ['data.product'],
    });

    // Group prices by product ID
    const pricesByProduct: Record<string, Stripe.Price[]> = {};
    for (const price of pricesResponse.data) {
      const productId = typeof price.product === 'string' ? price.product : price.product?.id;
      if (productId) {
        if (!pricesByProduct[productId]) pricesByProduct[productId] = [];
        pricesByProduct[productId].push(price);
      }
    }

    let products = productsResponse.data.map((product) => {
      const prices = pricesByProduct[product.id] ?? [];
      const defaultPrice = product.default_price as Stripe.Price | null;
      const activePrice = defaultPrice ?? prices.find((p) => p.active) ?? prices[0] ?? null;

      return {
        id: product.id,
        name: product.name,
        description: product.description ?? '',
        active: product.active,
        images: product.images ?? [],
        metadata: product.metadata ?? {},
        created: product.created,
        updated: product.updated,
        defaultPriceId: typeof product.default_price === 'string' ? product.default_price : product.default_price?.id ?? null,
        prices: prices.map((p) => ({
          id: p.id,
          active: p.active,
          currency: p.currency,
          unitAmount: p.unit_amount,
          unitAmountDecimal: p.unit_amount_decimal,
          recurring: p.recurring
            ? { interval: p.recurring.interval, intervalCount: p.recurring.interval_count }
            : null,
          nickname: p.nickname,
          type: p.type,
        })),
        // Convenience fields from active price
        price: activePrice?.unit_amount ? activePrice.unit_amount / 100 : null,
        currency: activePrice?.currency ?? 'usd',
        priceId: activePrice?.id ?? null,
        isRecurring: activePrice?.type === 'recurring',
        interval: activePrice?.recurring?.interval ?? null,
      };
    });

    // Client-side search filter
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ products, total: products.length });
  } catch (error: unknown) {
    console.error('[STRIPE PRODUCTS] Fetch error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch Stripe products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { 
      name, 
      description, 
      price, 
      currency = 'usd', 
      recurring, 
      interval, 
      interval_count,
      metadata,
      images,
      tax_behavior,
    } = body;

    if (!name) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });

    // Handle image upload to Supabase Storage for public URL
    let imageUrls: string[] = [];
    if (images && Array.isArray(images) && images.length > 0) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        for (const base64Image of images) {
          if (base64Image && typeof base64Image === 'string') {
            const base64Data = base64Image.includes('base64,')
              ? base64Image.split('base64,')[1]
              : base64Image;
            const mimeMatch = base64Image.match(/data:([^;]+);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
            const ext = mimeType.split('/')[1] || 'png';
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, buffer, { contentType: mimeType, upsert: true });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
              if (urlData?.publicUrl) {
                imageUrls.push(urlData.publicUrl);
              }
            } else {
              console.error('[STRIPE PRODUCTS] Supabase upload error:', uploadError);
            }
          }
        }
      } catch (imageError) {
        console.error('[STRIPE PRODUCTS] Image upload error:', imageError);
      }
    }

    // Prepare product metadata
    const productMetadata = metadata || {};
    
    // Create product in Stripe
    const product = await stripe.products.create({
      name,
      description: description || undefined,
      metadata: productMetadata,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      tax_code: productMetadata.category || undefined,
    });

    // Create price if provided
    let createdPrice: Stripe.Price | null = null;
    if (price && price > 0) {
      const priceParams: {
        product: string;
        unit_amount: number;
        currency: string;
        recurring?: { interval: 'day' | 'week' | 'month' | 'year'; interval_count?: number };
        tax_behavior?: 'inclusive' | 'exclusive' | 'unspecified';
      } = {
        product: product.id,
        unit_amount: Math.round(price * 100),
        currency,
      };

      // Add recurring information if applicable
      if (recurring) {
        const validInterval = (interval ?? 'month') as 'day' | 'week' | 'month' | 'year';
        priceParams.recurring = {
          interval: validInterval,
        };
        
        // Add interval_count if specified (for "Every 3 months", "Every 6 months", etc.)
        if (interval_count && interval_count > 1) {
          priceParams.recurring.interval_count = interval_count;
        }
      }

      // Add tax behavior if specified
      if (tax_behavior && ['inclusive', 'exclusive', 'unspecified'].includes(tax_behavior)) {
        priceParams.tax_behavior = tax_behavior as 'inclusive' | 'exclusive' | 'unspecified';
      }

      createdPrice = await stripe.prices.create(priceParams);

      // Set as default price
      await stripe.products.update(product.id, { default_price: createdPrice.id });
    }

    return NextResponse.json({ product, price: createdPrice }, { status: 201 });
  } catch (error: unknown) {
    console.error('[STRIPE PRODUCTS] Create error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create Stripe product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
