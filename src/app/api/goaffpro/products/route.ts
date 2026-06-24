import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getGoAffProAccessToken } from '@/lib/integration-settings';
import { goaffproService, GoAffProConfig } from '@/lib/goaffpro';

export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const payload = await req.json();
  const { name, description, price, sku, url } = payload;
  if (!name) {
    return NextResponse.json({ error: 'Missing product name' }, { status: 400 });
  }

  const accessToken = await getGoAffProAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'GoAffPro not configured' }, { status: 400 });
  }

  try {
    const config: GoAffProConfig = { accessToken };
    const result = await goaffproService.createProduct(config, { name, description, price, sku, url });
    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error('[GOAFFPRO PRODUCT CREATE]', error);
    const message = error instanceof Error ? error.message : 'Failed to create GoAffPro product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
