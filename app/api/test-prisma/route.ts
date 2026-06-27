import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const count = await prisma.checkoutSession.count();
    return NextResponse.json({ success: true, count });
  } catch (err) {
    const error = err as Error;
    console.error('Prisma test error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}