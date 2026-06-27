import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, EmailType } from '@/lib/email/emailRouter';
import crypto from 'crypto';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: { email },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (customer.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: expiryDate,
      },
    });

    // Send verification email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://merchantos.com';
    const verificationLink = `${siteUrl}/portal/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      type: EmailType.ACCOUNT_VERIFICATION,
      data: {
        email,
        verificationLink,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('[RESEND VERIFICATION] Error:', error);
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 });
  }
}
