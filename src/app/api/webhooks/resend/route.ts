import { NextRequest, NextResponse } from 'next/server';
import { handleResendWebhook } from '@/lib/email/email-tracking';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature if configured
    const signature = request.headers.get('resend-signature');
    if (process.env.RESEND_WEBHOOK_SECRET && signature) {
      // TODO: Implement signature verification
      // For now, we'll trust the webhook in development
    }

    // Process the webhook event
    await handleResendWebhook(body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Resend webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error.message },
      { status: 500 }
    );
  }
}
