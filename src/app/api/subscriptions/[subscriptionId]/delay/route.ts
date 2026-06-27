import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';
import { Resend } from 'resend';

export const runtime = 'nodejs';
async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    // TODO: Verify customer session cookie
    // For now, we'll allow the request but this should be secured

    const body = await request.json();
    const { weeks } = body;

    if (![2, 4, 6].includes(weeks)) {
      return NextResponse.json(
        { error: 'Invalid delay period. Must be 2, 4, or 6 weeks.' },
        { status: 400 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: params.subscriptionId },
      include: { customer: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Calculate new billing date
    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const newBillingDate = new Date(currentPeriodEnd.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

    // Update Stripe subscription
    if (subscription.stripeSubscriptionId) {
      const stripe = await getStripe();
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
      }

      try {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          trial_end: Math.floor(newBillingDate.getTime() / 1000),
        });
      } catch (stripeError: any) {
        console.error('Stripe update error:', stripeError);
        return NextResponse.json(
          { error: 'Failed to update subscription in Stripe', details: stripeError.message },
          { status: 500 }
        );
      }
    }

    // Update local subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodEnd: newBillingDate,
        nextBillingAt: newBillingDate,
        delayCount: subscription.delayCount + 1,
        lastDelayedAt: new Date(),
      },
    });

    // Send confirmation email
    try {
      const formattedDate = newBillingDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@merchantos.com',
        to: subscription.customer.email,
        subject: `Your ${subscription.planName} has been delayed`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
                .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
                .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✓ Subscription Delayed</h1>
                </div>
                <div class="content">
                  <p>Hi ${subscription.customer.name || 'there'},</p>
                  <p>Your <strong>${subscription.planName}</strong> subscription has been successfully delayed by ${weeks} weeks.</p>
                  <div class="highlight">
                    <strong>New Billing Date:</strong> ${formattedDate}
                  </div>
                  <p>Your next order will ship on this new date. You can manage your subscription anytime from your portal.</p>
                </div>
                <div class="footer">
                  <p>Questions? Contact our support team.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      // Silent failure for email
      console.error('Email send error:', emailError);
    }

    return NextResponse.json({
      success: true,
      newBillingDate: newBillingDate.toISOString(),
    });

  } catch (error: any) {
    console.error('Delay subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to delay subscription', details: error.message },
      { status: 500 }
    );
  }
}
