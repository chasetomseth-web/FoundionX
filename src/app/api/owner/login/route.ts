import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { key } = await req.json().catch(() => ({ key: '' }));

  if (!key || key !== process.env.OWNER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('owner_access', key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });
  return res;
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
