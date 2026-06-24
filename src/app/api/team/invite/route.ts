import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { email, role } = body;

  // TODO: Send invitation email and create pending team member
  return NextResponse.json({ success: true, message: `Invitation sent to ${email}` });
}