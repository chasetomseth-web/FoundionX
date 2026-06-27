import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';
async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

// Common tax codes for product categories
const FALLBACK_TAX_CODES = [
  { id: 'txcd_10000000', name: 'General - Services', description: 'General services' },
  { id: 'txcd_10103000', name: 'Digital Products', description: 'Electronically supplied services' },
  { id: 'txcd_99999999', name: 'Physical Goods', description: 'Tangible personal property' },
  { id: 'txcd_10501000', name: 'Software as a Service (SaaS)', description: 'Software as a service' },
  { id: 'txcd_10502000', name: 'Platform as a Service (PaaS)', description: 'Platform as a service' },
  { id: 'txcd_20030000', name: 'Consulting Services', description: 'Consulting and professional services' },
  { id: 'txcd_30011000', name: 'Online Courses', description: 'Educational services delivered electronically' },
  { id: 'txcd_10401000', name: 'Hosting Services', description: 'Website and data hosting services' },
];

export async function GET() {
  const stripe = await getStripe();
  
  if (!stripe) {
    // Return fallback list if Stripe not configured
    return NextResponse.json({ taxCodes: FALLBACK_TAX_CODES });
  }

  try {
    // Fetch tax codes from Stripe
    const taxCodes = await stripe.taxCodes.list({ limit: 100 });
    
    const formattedCodes = taxCodes.data.map((code) => ({
      id: code.id,
      name: code.name,
      description: code.description,
    }));

    // If we got results, return them, otherwise return fallback
    return NextResponse.json({ 
      taxCodes: formattedCodes.length > 0 ? formattedCodes : FALLBACK_TAX_CODES 
    });
  } catch (error: unknown) {
    console.error('[STRIPE TAX CODES] Fetch error:', error);
    // Return fallback on error
    return NextResponse.json({ taxCodes: FALLBACK_TAX_CODES });
  }
}