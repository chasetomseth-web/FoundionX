import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Load API keys from database
  return NextResponse.json({ keys: [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  // Generate API key
  const key = `mk_${crypto.randomBytes(32).toString('hex')}`;
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

  // TODO: Store hashedKey in database with name
  // Only return the full key once
  return NextResponse.json({ key, prefix: key.substring(0, 10) });
}