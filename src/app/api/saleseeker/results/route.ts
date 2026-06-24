import { NextRequest } from 'next/server';
import { getSaleseekerResults, requireSaleseekerAuth } from '../lib/saleseeker';

export async function GET(req: NextRequest) {
  const authError = await requireSaleseekerAuth(req);
  if (authError) return authError;

  try {
    const results = await getSaleseekerResults();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load Saleseeker results.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
