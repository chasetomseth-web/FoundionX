import { NextRequest, NextResponse } from 'next/server';
import { registerCustomer, setCustomerSessionCookie } from '@/lib/customer-auth';
import { sendEmail, EmailType } from '@/lib/email/emailRouter';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, storeId } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
    const userAgent = req.headers.get('user-agent') ?? undefined;

    const result = await registerCustomer({
      storeId: storeId ?? 'default',
      email,
      password,
      name,
      ipAddress,
      userAgent,
    });

    if (!result.success || !result.customer) {
      return NextResponse.json({ error: result.error || 'Registration failed' }, { status: 409 });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update customer with verification token
    await prisma.customer.update({
      where: { id: result.customer.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: expiryDate,
        emailVerified: false,
      },
    });

    // Send verification email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://merchantos.com';
    const verificationLink = `${siteUrl}/portal/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    try {
      await sendEmail({
        type: EmailType.ACCOUNT_VERIFICATION,
        data: {
          email,
          verificationLink,
        },
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue - customer can request resend later
    }

    const response = NextResponse.json({
      success: true,
      customer: result.customer,
      message: 'Account created! Please check your email to verify your account.',
    });

    // Don't auto-login - require email verification first
    // if (result.token) {
    //   setCustomerSessionCookie(response, result.token);
    // }

    return response;
  } catch (error) {
    console.error('[CUSTOMER REGISTER] Error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
