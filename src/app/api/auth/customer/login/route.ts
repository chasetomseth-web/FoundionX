import { NextRequest, NextResponse } from 'next/server';
import { loginCustomer, setCustomerSessionCookie } from '@/lib/customer-auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, storeId } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
    const userAgent = req.headers.get('user-agent') ?? undefined;

    const result = await loginCustomer({
      storeId: storeId ?? 'default', // Use provided storeId or default
      email,
      password,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Check if email is verified
    if (result.customer && !result.customer.emailVerified) {
      return NextResponse.json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
      }, { status: 403 });
    }

    const response = NextResponse.json({
      success: true,
      customer: result.customer,
    });

    if (result.token) {
      setCustomerSessionCookie(response, result.token);
    }

    return response;
  } catch (error) {
    console.error('[CUSTOMER LOGIN] Error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}