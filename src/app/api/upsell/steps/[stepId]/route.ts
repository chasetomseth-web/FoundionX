import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/upsell/steps/[stepId]
 * Returns step data for the upsell flow page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { stepId: string } }
) {
  try {
    const { stepId } = params;

    if (!stepId) {
      return NextResponse.json({ error: 'Step ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the funnel step from Supabase
    const { data: step, error: stepError } = await supabase
      .from('funnel_steps')
      .select('*')
      .eq('id', stepId)
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: 'Funnel step not found' }, { status: 404 });
    }

    // Fetch the funnel to get additional info
    const { data: funnel } = await supabase
      .from('upsell_funnels')
      .select('*')
      .eq('id', step.funnel_id)
      .single();

    // Build accept/decline URLs
    // For now, use simple continuation logic - can be enhanced with actual URLs from funnel config
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const acceptUrl = step.accept_next_step_order 
      ? `${baseUrl}/upsell?stepId=${step.accept_next_step_order}`
      : `${baseUrl}/portal/orders`; // Default: go to orders page when funnel completes
    
    const declineUrl = step.decline_next_step_order
      ? `${baseUrl}/upsell?stepId=${step.decline_next_step_order}`
      : `${baseUrl}/portal/orders`; // Default: go to orders page when declined

    // Convert price from cents to dollars
    const priceInDollars = step.price_cents / 100;

    // Return data in the format expected by UpsellFlow component
    return NextResponse.json({
      productName: step.name,
      productDescription: step.html_content || `Special offer: ${step.name}`,
      productImage: funnel?.metadata?.image || '/assets/images/no_image.png',
      price: priceInDollars,
      currency: (step.currency || 'USD').toUpperCase(),
      acceptUrl,
      declineUrl,
    });
  } catch (error) {
    console.error('[UPSELL STEPS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upsell step data' },
      { status: 500 }
    );
  }
}
