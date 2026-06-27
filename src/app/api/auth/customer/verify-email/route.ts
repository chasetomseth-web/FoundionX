import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const { token, email } = await req.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { email },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (customer.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email already verified' });
    }

    if (customer.emailVerificationToken !== token) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
    }

    if (customer.emailVerificationExpiry && customer.emailVerificationExpiry < new Date()) {
      return NextResponse.json({ error: 'Verification token has expired' }, { status: 400 });
    }

    // Verify the email
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    console.error('[EMAIL VERIFY] Error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
